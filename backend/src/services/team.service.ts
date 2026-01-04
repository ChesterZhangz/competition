import mongoose from 'mongoose';
import {
  CompetitionTeam,
  ICompetitionTeamDocument,
  TeamRole,
} from '../models/competition-team.model';
import {
  Competition,
  CompetitionParticipant,
  ICompetitionParticipantDocument,
} from '../models';
import { redisHelpers, redis } from '../config/redis';

export interface CreateTeamInput {
  name: string;
  color?: string;
}

export interface TeamLeaderboardEntry {
  teamId: string;
  name: string;
  color: string;
  memberCount: number;
  totalScore: number;
  averageScore: number;
  correctCount: number;
  wrongCount: number;
  rank: number;
}

export class TeamService {
  // Create a new team
  async createTeam(
    competitionId: string,
    captainParticipantId: string,
    input: CreateTeamInput
  ): Promise<ICompetitionTeamDocument> {
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new Error('Competition not found');
    }

    if (!competition.settings.teamSettings?.enabled) {
      throw new Error('Team mode is not enabled for this competition');
    }

    // Check if participant exists and is not already in a team
    const participant = await CompetitionParticipant.findById(captainParticipantId);
    if (!participant) {
      throw new Error('Participant not found');
    }

    if (participant.teamId) {
      throw new Error('Participant is already in a team');
    }

    // Check if team name is unique in this competition
    const existingTeam = await CompetitionTeam.findOne({
      competitionId: new mongoose.Types.ObjectId(competitionId),
      name: input.name,
    });

    if (existingTeam) {
      throw new Error('Team name already exists');
    }

    // Create team
    const team = await CompetitionTeam.create({
      competitionId: new mongoose.Types.ObjectId(competitionId),
      name: input.name,
      color: input.color || this.generateRandomColor(),
      captainId: new mongoose.Types.ObjectId(captainParticipantId),
      maxSize: competition.settings.teamSettings.teamSize || 4,
      members: [
        {
          participantId: new mongoose.Types.ObjectId(captainParticipantId),
          role: 'both' as TeamRole,
          joinedAt: new Date(),
        },
      ],
    });

    // Update participant with team ID
    await CompetitionParticipant.updateOne(
      { _id: captainParticipantId },
      { teamId: team._id, role: 'both' }
    );

    // Increment team count in competition
    await Competition.updateOne(
      { _id: competitionId },
      { $inc: { teamCount: 1 } }
    );

    return team;
  }

  // Join an existing team
  async joinTeam(
    teamId: string,
    participantId: string,
    role: TeamRole = 'both'
  ): Promise<ICompetitionTeamDocument> {
    const team = await CompetitionTeam.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    if (!team.isActive) {
      throw new Error('Team is no longer active');
    }

    // Check team size
    const competition = await Competition.findById(team.competitionId);
    if (!competition) {
      throw new Error('Competition not found');
    }

    const maxSize = competition.settings.teamSettings?.teamSize || 4;
    if (team.members.length >= maxSize) {
      throw new Error('Team is full');
    }

    // Check if participant exists and is not already in a team
    const participant = await CompetitionParticipant.findById(participantId);
    if (!participant) {
      throw new Error('Participant not found');
    }

    if (participant.teamId) {
      throw new Error('Participant is already in a team');
    }

    // Validate role based on team mode
    const roleMode = competition.settings.teamSettings?.roleMode || 'all_equal';
    if (roleMode === 'split_view') {
      // In split_view mode, need to validate role assignment
      const hasViewer = team.members.some((m) => m.role === 'viewer');
      const hasSubmitter = team.members.some((m) => m.role === 'submitter');

      if (role === 'viewer' && hasViewer) {
        throw new Error('Team already has a viewer');
      }
      if (role === 'submitter' && hasSubmitter) {
        throw new Error('Team already has a submitter');
      }
    }

    // Add member to team
    team.members.push({
      participantId: new mongoose.Types.ObjectId(participantId),
      role,
      joinedAt: new Date(),
    });
    await team.save();

    // Update participant with team ID and role
    await CompetitionParticipant.updateOne(
      { _id: participantId },
      { teamId: team._id, role }
    );

    return team;
  }

  // Leave team
  async leaveTeam(
    teamId: string,
    participantId: string
  ): Promise<ICompetitionTeamDocument | null> {
    const team = await CompetitionTeam.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const memberIndex = team.members.findIndex(
      (m) => m.participantId.toString() === participantId
    );

    if (memberIndex === -1) {
      throw new Error('Not a member of this team');
    }

    // If captain is leaving and there are other members, transfer captaincy
    if (team.captainId.toString() === participantId && team.members.length > 1) {
      // Find another member to be captain
      const otherMember = team.members.find(
        (m) => m.participantId.toString() !== participantId
      );
      if (otherMember) {
        team.captainId = otherMember.participantId;
      }
    }

    // Remove member from team
    team.members.splice(memberIndex, 1);

    // If no members left, mark team as inactive
    if (team.members.length === 0) {
      team.isActive = false;
      // Decrement team count
      await Competition.updateOne(
        { _id: team.competitionId },
        { $inc: { teamCount: -1 } }
      );
    }

    await team.save();

    // Update participant to remove team
    await CompetitionParticipant.updateOne(
      { _id: participantId },
      { $unset: { teamId: 1 }, role: 'both' }
    );

    return team;
  }

  // Transfer captain role
  async transferCaptain(
    teamId: string,
    currentCaptainId: string,
    newCaptainId: string
  ): Promise<ICompetitionTeamDocument> {
    const team = await CompetitionTeam.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    if (team.captainId.toString() !== currentCaptainId) {
      throw new Error('Not the team captain');
    }

    // Check if new captain is a member
    const isMember = team.members.some(
      (m) => m.participantId.toString() === newCaptainId
    );

    if (!isMember) {
      throw new Error('New captain must be a team member');
    }

    team.captainId = new mongoose.Types.ObjectId(newCaptainId);
    await team.save();

    return team;
  }

  // Update member role (for split_view mode)
  async updateMemberRole(
    teamId: string,
    participantId: string,
    newRole: TeamRole,
    requesterId: string
  ): Promise<ICompetitionTeamDocument> {
    const team = await CompetitionTeam.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    // Only captain can update roles
    if (team.captainId.toString() !== requesterId) {
      throw new Error('Only captain can update roles');
    }

    const memberIndex = team.members.findIndex(
      (m) => m.participantId.toString() === participantId
    );

    if (memberIndex === -1) {
      throw new Error('Not a member of this team');
    }

    // Validate role assignment for split_view mode
    const competition = await Competition.findById(team.competitionId);
    if (competition?.settings.teamSettings?.roleMode === 'split_view') {
      const hasViewer = team.members.some(
        (m, i) => i !== memberIndex && m.role === 'viewer'
      );
      const hasSubmitter = team.members.some(
        (m, i) => i !== memberIndex && m.role === 'submitter'
      );

      if (newRole === 'viewer' && hasViewer) {
        throw new Error('Team already has a viewer');
      }
      if (newRole === 'submitter' && hasSubmitter) {
        throw new Error('Team already has a submitter');
      }
    }

    team.members[memberIndex].role = newRole;
    await team.save();

    // Update participant role
    await CompetitionParticipant.updateOne(
      { _id: participantId },
      { role: newRole }
    );

    return team;
  }

  // Disband team (only captain can do this)
  async disbandTeam(teamId: string, captainId: string): Promise<void> {
    const team = await CompetitionTeam.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    if (team.captainId.toString() !== captainId) {
      throw new Error('Only captain can disband the team');
    }

    // Remove all members from the team
    const memberIds = team.members.map((m) => m.participantId);
    await CompetitionParticipant.updateMany(
      { _id: { $in: memberIds } },
      { $unset: { teamId: 1 }, role: 'both' }
    );

    // Mark team as inactive
    team.isActive = false;
    team.members = [];
    await team.save();

    // Decrement team count
    await Competition.updateOne(
      { _id: team.competitionId },
      { $inc: { teamCount: -1 } }
    );
  }

  // Get team by ID with populated members
  async getTeamById(teamId: string): Promise<ICompetitionTeamDocument | null> {
    return CompetitionTeam.findById(teamId)
      .populate({
        path: 'members.participantId',
        select: 'nickname avatar isOnline totalScore',
      })
      .populate('captainId', 'nickname avatar');
  }

  // Get teams for a competition
  async getTeamsByCompetition(
    competitionId: string
  ): Promise<ICompetitionTeamDocument[]> {
    return CompetitionTeam.find({
      competitionId: new mongoose.Types.ObjectId(competitionId),
      isActive: true,
    })
      .populate({
        path: 'members.participantId',
        select: 'nickname avatar isOnline',
      })
      .sort({ totalScore: -1 });
  }

  // Get team for a participant
  async getParticipantTeam(
    participantId: string
  ): Promise<ICompetitionTeamDocument | null> {
    const participant = await CompetitionParticipant.findById(participantId);
    if (!participant || !participant.teamId) {
      return null;
    }
    return this.getTeamById(participant.teamId.toString());
  }

  // Update team scores based on member scores
  async updateTeamScores(competitionId: string): Promise<void> {
    const teams = await CompetitionTeam.find({
      competitionId: new mongoose.Types.ObjectId(competitionId),
      isActive: true,
    });

    for (const team of teams) {
      const memberIds = team.members.map((m) => m.participantId);
      const members = await CompetitionParticipant.find({
        _id: { $in: memberIds },
      });

      let totalScore = 0;
      let correctCount = 0;
      let wrongCount = 0;

      for (const member of members) {
        totalScore += member.totalScore;
        correctCount += member.correctCount;
        wrongCount += member.wrongCount;
      }

      team.totalScore = totalScore;
      team.correctCount = correctCount;
      team.wrongCount = wrongCount;
      team.averageScore = members.length > 0 ? totalScore / members.length : 0;
      await team.save();
    }
  }

  // Get team leaderboard
  async getTeamLeaderboard(
    competitionId: string,
    limit = 10
  ): Promise<TeamLeaderboardEntry[]> {
    // First update all team scores
    await this.updateTeamScores(competitionId);

    const teams = await CompetitionTeam.find({
      competitionId: new mongoose.Types.ObjectId(competitionId),
      isActive: true,
    })
      .sort({ totalScore: -1, correctCount: -1 })
      .limit(limit);

    return teams.map((team, index) => ({
      teamId: team._id.toString(),
      name: team.name,
      color: team.color,
      memberCount: team.members.length,
      totalScore: team.totalScore,
      averageScore: team.averageScore,
      correctCount: team.correctCount,
      wrongCount: team.wrongCount,
      rank: index + 1,
    }));
  }

  // Update team rankings
  async updateTeamRankings(competitionId: string): Promise<void> {
    const teams = await CompetitionTeam.find({
      competitionId: new mongoose.Types.ObjectId(competitionId),
      isActive: true,
    }).sort({ totalScore: -1, correctCount: -1 });

    for (let i = 0; i < teams.length; i++) {
      teams[i].rank = i + 1;
      await teams[i].save();

      // Also update in Redis for fast access
      await redis.zadd(
        `competition:${competitionId}:team-leaderboard`,
        teams[i].totalScore,
        teams[i]._id.toString()
      );
    }
  }

  // Check if participant can submit (based on role)
  async canSubmit(participantId: string): Promise<boolean> {
    const participant = await CompetitionParticipant.findById(participantId);
    if (!participant) return false;

    // If no team, can submit
    if (!participant.teamId) return true;

    // Check role
    return participant.role === 'submitter' || participant.role === 'both';
  }

  // Check if participant can view question (based on role)
  async canViewQuestion(participantId: string): Promise<boolean> {
    const participant = await CompetitionParticipant.findById(participantId);
    if (!participant) return false;

    // If no team, can view
    if (!participant.teamId) return true;

    // Check role
    return participant.role === 'viewer' || participant.role === 'both';
  }

  // Generate random team color
  private generateRandomColor(): string {
    const colors = [
      '#2cb1bc', // cyan
      '#f56565', // red
      '#48bb78', // green
      '#ed8936', // orange
      '#9f7aea', // purple
      '#4299e1', // blue
      '#ed64a6', // pink
      '#ecc94b', // yellow
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

export const teamService = new TeamService();
