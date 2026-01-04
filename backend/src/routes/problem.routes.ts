import { Router } from 'express';
import { problemController } from '../controllers/problem.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireTeacher } from '../middlewares/role.middleware';

const router = Router();

// All problem routes require authentication AND teacher role
router.use(authenticate);
router.use(requireTeacher);

// Problem Bank routes (teacher+ only)
router.post('/banks', problemController.createBank.bind(problemController));
router.get('/banks', problemController.listBanks.bind(problemController));
router.get('/banks/:id', problemController.getBank.bind(problemController));
router.put('/banks/:id', problemController.updateBank.bind(problemController));
router.delete('/banks/:id', problemController.deleteBank.bind(problemController));

// Problem routes (teacher+ only)
router.post('/batch', problemController.batchCreateProblems.bind(problemController));
router.post('/', problemController.createProblem.bind(problemController));
router.get('/', problemController.listProblems.bind(problemController));
router.get('/:id', problemController.getProblem.bind(problemController));
router.put('/:id', problemController.updateProblem.bind(problemController));
router.delete('/:id', problemController.deleteProblem.bind(problemController));
router.post('/:id/duplicate', problemController.duplicateProblem.bind(problemController));

export default router;
