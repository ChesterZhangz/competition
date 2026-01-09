import { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, Download, BookOpen, GraduationCap, Calculator, Box, Layers, Camera, Check, Loader2, MapPin, Video, List, FileText } from 'lucide-react';

// 课程数据源：深度融合讲义内容
const SCHEDULE_DATA = [
  {
    id: 1,
    date: '2026-01-31',
    lesson: '第一课时',
    chapter: '第九章 平面向量',
    topic: '向量的基本运算与线性组合',
    type: 'lecture',
    icon: <Calculator className="w-4 h-4" />,
    details: [
      '向量定义：既有大小又有方向 / 有序数组',
      '线性运算：加法(交换/结合律)、数乘、分配律',
      '线性空间初步：线性组合、线性相关与无关',
      '基底概念：张成空间与维数'
    ]
  },
  {
    id: 2,
    date: '2026-02-01',
    lesson: '第二课时',
    chapter: '第九章 平面向量',
    topic: '平面向量的几何意义',
    type: 'lecture',
    icon: <Calculator className="w-4 h-4" />,
    details: [
      '几何表示：有向线段',
      '加法几何意义：三角形法则、平行四边形法则',
      '数量积(点积)：投影与夹角公式 cosθ',
      '垂直判定：a·b = 0'
    ]
  },
  {
    id: 3,
    date: '2026-02-03',
    lesson: '第三课时',
    chapter: '第九章 平面向量',
    topic: '平面几何问题中的坐标表示',
    type: 'lecture',
    icon: <Calculator className="w-4 h-4" />,
    details: [
      '坐标系建立与向量坐标',
      '向量运算的坐标形式',
      '平面几何定理的向量证明',
      '解析几何初步'
    ]
  },
  {
    id: 4,
    date: '2026-02-05',
    lesson: '第四课时',
    chapter: '第九章 平面向量',
    topic: '习题课1: 平面向量',
    type: 'exercise',
    icon: <BookOpen className="w-4 h-4" />,
    details: [
      '向量恒等式证明',
      '解三角形应用：正弦/余弦定理的向量推导',
      '综合练习与答疑'
    ]
  },
  {
    id: 5,
    date: '2026-02-07',
    lesson: '第五课时',
    chapter: '第十章 空间与立体几何',
    topic: '空间公理与简单几何体(介绍)',
    type: 'lecture',
    icon: <Box className="w-4 h-4" />,
    details: [
      '空间几何基础：公理体系',
      '简单几何体：柱体、锥体、球体',
      '空间中的点、线、面关系',
      '三视图与直观图'
    ]
  },
  {
    id: 6,
    date: '2026-02-10',
    lesson: '第六课时',
    chapter: '第十章 空间与立体几何',
    topic: '直线与平面(详细)',
    type: 'lecture',
    icon: <Box className="w-4 h-4" />,
    details: [
      '线线平行与垂直',
      '线面平行：判定定理与性质定理',
      '线面垂直：判定定理与性质定理',
      '空间角度计算基础'
    ]
  },
  {
    id: 7,
    date: '2026-02-12',
    lesson: '第七课时',
    chapter: '第十章 空间与立体几何',
    topic: '平面与平面(详细)',
    type: 'lecture',
    icon: <Box className="w-4 h-4" />,
    details: [
      '面面平行：判定定理与性质定理',
      '面面垂直：二面角及其平面角',
      '几何体的截面问题'
    ]
  },
  {
    id: 8,
    date: '2026-02-14',
    lesson: '第八课时',
    chapter: '第十章 空间与立体几何',
    topic: '空间体系应用: 简单几何体',
    type: 'lecture',
    icon: <Box className="w-4 h-4" />,
    details: [
      '几何体的度量：表面积与体积',
      '球的问题：外接球与内切球',
      '截面与球的综合计算'
    ]
  },
  {
    id: 9,
    date: '2026-02-21',
    lesson: '第九课时',
    chapter: '第十章 空间与立体几何',
    topic: '习题课2: 空间与立体几何',
    type: 'exercise',
    icon: <BookOpen className="w-4 h-4" />,
    details: [
      '空间位置关系证明专项',
      '几何体计算综合题',
      '典型错题分析与答疑'
    ]
  },
  {
    id: 10,
    date: '2026-02-22',
    lesson: '第十课时',
    chapter: '第十一章 空间向量',
    topic: '空间向量基础',
    type: 'lecture',
    icon: <Layers className="w-4 h-4" />,
    details: [
      '空间向量的定义与表示',
      '空间向量的线性运算',
      '共面向量定理',
      '空间向量运算律：类比平面向量'
    ]
  },
  {
    id: 11,
    date: '2026-02-24',
    lesson: '第十一课时',
    chapter: '第十一章 空间向量',
    topic: '空间向量的坐标表示、空间向量在立体几何应用',
    type: 'lecture',
    icon: <Layers className="w-4 h-4" />,
    details: [
      '空间直角坐标系：标准基底 (i, j, k)',
      '坐标运算：模长、夹角、距离公式',
      '立体几何向量化：证明平行/垂直',
      '求空间角：线面角、二面角'
    ]
  },
  {
    id: 12,
    date: '2026-02-26',
    lesson: '第十二课时',
    chapter: '第十一章 空间向量',
    topic: '习题课3: 空间向量',
    type: 'exercise',
    icon: <BookOpen className="w-4 h-4" />,
    details: [
      '建系方法的选择技巧',
      '法向量的应用专项',
      '空间向量综合难题攻克'
    ]
  },
  {
    id: 13,
    date: '2026-02-27',
    lesson: '第十三课时',
    chapter: '复习讲义',
    topic: '期末复习与总结',
    type: 'review',
    icon: <BookOpen className="w-4 h-4" />,
    details: [
      '平面向量核心知识回顾',
      '立体几何重点定理梳理',
      '空间向量方法总结',
      '综合模拟题讲解'
    ]
  }
];

interface ScheduleItem {
  id: number;
  date: string;
  lesson: string;
  chapter: string;
  topic: string;
  type: string;
  icon: React.ReactNode;
  details: string[];
}

const getDisplayDate = (dateStr: string) => {
  const parts = dateStr.split('-');
  return {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10),
    day: parseInt(parts[2], 10)
  };
};

const getWeekday = (dateStr: string) => {
  const parts = dateStr.split('-');
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weekdays[date.getDay()];
};

const formatICSDate = (dateStr: string, timeStr: string) => {
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(5, 7);
  const day = dateStr.substring(8, 10);
  const hour = parseInt(timeStr.substring(0, 2));
  const minute = timeStr.substring(3, 5);
  const utcHour = hour - 8;
  const format = (n: number) => n < 10 ? `0${n}` : n;
  return `${year}${month}${day}T${format(utcHour)}${minute}00Z`;
};

const generateICS = () => {
  let icsContent =
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MMS Math//Course Schedule 2026//CN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:2026 MMS 冬季数学课
X-WR-TIMEZONE:Asia/Shanghai
`;

  SCHEDULE_DATA.forEach(item => {
    const dtStart = formatICSDate(item.date, '10:10');
    const dtEnd = formatICSDate(item.date, '12:10');
    const detailDesc = item.details ? item.details.join('\\n- ') : '';

    icsContent +=
`BEGIN:VEVENT
UID:${item.date}-${item.id}@mms.math
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:MMS数学 ${item.lesson}: ${item.topic}
DESCRIPTION:章节: ${item.chapter}\\n内容: ${item.topic}\\n\\n详细大纲:\\n- ${detailDesc}\\n\\n腾讯会议: 993-855-9289
LOCATION:Tencent Meeting 993-855-9289
STATUS:CONFIRMED
END:VEVENT
`;
  });

  icsContent += `END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', '2026_MMS_Winter_Math_Schedule.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

interface CalendarDayProps {
  day: number | null;
  month: number;
  year: number;
  events: ScheduleItem[];
  isCurrentMonth: boolean;
}

const CalendarDay = ({ day, month, year, events, isCurrentMonth }: CalendarDayProps) => {
  const monthStr = month < 10 ? `0${month}` : month;
  const dayStr = day && day < 10 ? `0${day}` : day;
  const dateStr = `${year}-${monthStr}-${dayStr}`;

  const dayEvents = events.filter(e => e.date === dateStr);

  const checkDate = new Date(year, month - 1, day || 1, 12, 0, 0);
  const isWeekend = checkDate.getDay() === 0 || checkDate.getDay() === 6;

  if (!day) return <div className="min-h-[9rem] bg-gray-50/30 border border-gray-100/50"></div>;

  return (
    <div className={`min-h-[9rem] border border-cyan-100 p-1 sm:p-2 flex flex-col transition-colors relative group/day ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'} ${dayEvents.length > 0 ? 'bg-cyan-50/60' : ''}`}>
      <div className={`text-xs sm:text-sm font-medium mb-1 ${isWeekend ? 'text-red-400' : 'text-gray-500'} ${dayEvents.length > 0 ? 'text-cyan-700 font-bold' : ''}`}>
        {day}
      </div>
      <div className="flex-1 space-y-1 relative overflow-visible">
        {dayEvents.map((evt) => (
          <div key={evt.id} className="relative group/event">
            <div className="bg-cyan-600 text-white text-[10px] sm:text-xs p-1.5 rounded shadow-sm leading-tight cursor-default transition-colors">
               <span className="font-bold block mb-0.5">{evt.lesson}</span>
               <span className="opacity-95 hidden sm:block truncate text-[10px]">{evt.topic}</span>
            </div>

             {/* 悬停详情卡片 */}
             <div className="hidden group-hover/event:block absolute z-50 left-0 top-[calc(100%+4px)] w-[260px] bg-slate-800 text-white p-4 rounded-xl text-xs shadow-2xl pointer-events-none ring-1 ring-white/10">
                <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-800 rotate-45 border-l border-t border-white/10"></div>
                <div className="font-bold mb-2 text-cyan-300 border-b border-white/10 pb-2 flex justify-between items-center">
                  <span className="text-sm">{getDisplayDate(evt.date).month}月{getDisplayDate(evt.date).day}日</span>
                  <span className="text-slate-400 font-normal bg-slate-700/50 px-2 py-0.5 rounded">{evt.lesson}</span>
                </div>
                <div className="mb-2 font-bold text-white text-sm leading-tight">{evt.topic}</div>
                {evt.details && (
                  <ul className="space-y-1 text-slate-300 list-disc list-outside ml-3 marker:text-cyan-500">
                    {evt.details.map((detail, idx) => (
                      <li key={idx} className="leading-snug">{detail}</li>
                    ))}
                  </ul>
                )}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface MonthGridProps {
  year: number;
  month: number;
  events: ScheduleItem[];
}

const MonthGrid = ({ year, month, events }: MonthGridProps) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayObj = new Date(year, month - 1, 1, 12, 0, 0);
  const startDay = firstDayObj.getDay();

  const days: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div className="mb-8 break-inside-avoid">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-sm mr-2 shadow-sm">{year}</span>
        {month}月
      </h3>
      <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg shadow-sm bg-white">
        {['日', '一', '二', '三', '四', '五', '六'].map((d, idx) => (
          <div key={idx} className="bg-gray-50 p-2 text-center text-xs font-semibold text-gray-500 border-b border-gray-200 first:rounded-tl-lg last:rounded-tr-lg">
            {d}
          </div>
        ))}
        {days.map((d, idx) => (
          <CalendarDay
            key={idx}
            day={d}
            month={month}
            year={year}
            events={events}
            isCurrentMonth={!!d}
          />
        ))}
      </div>
    </div>
  );
};

interface ListViewProps {
  events: ScheduleItem[];
}

const ListView = ({ events }: ListViewProps) => {
  return (
    <div className="space-y-6">
      {events.map((evt) => {
        const { month, day } = getDisplayDate(evt.date);
        const displayWeekday = getWeekday(evt.date);
        const monthEng = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month-1];

        return (
          <div key={evt.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col sm:flex-row gap-5 hover:shadow-lg hover:border-cyan-200 transition-all group break-inside-avoid relative overflow-hidden">
            {/* Decoration */}
            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

            {/* Date Box */}
            <div className="flex-shrink-0 flex sm:flex-col items-center justify-start bg-cyan-50/50 rounded-xl p-4 w-full sm:w-28 text-cyan-700 border border-cyan-100/50 self-start">
              <div className="text-xs font-bold uppercase tracking-wide opacity-70">
                {monthEng}
              </div>
              <div className="text-4xl font-bold leading-none my-1 tracking-tight text-cyan-800">
                {day}
              </div>
              <div className="text-xs font-medium bg-white px-3 py-1 rounded-full mt-2 shadow-sm text-cyan-600">
                {displayWeekday}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-start">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider text-white shadow-sm
                  ${evt.type === 'lecture' ? 'bg-cyan-500' :
                    evt.type === 'exercise' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                  {evt.lesson}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                  <Clock size={12} /> 10:10-12:10
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    {evt.chapter}
                </span>
              </div>

              <h4 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-cyan-700 transition-colors">
                {evt.topic}
              </h4>

              {/* Detailed Points */}
              {evt.details && (
                <div className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-100">
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-600">
                    {evt.details.map((point, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0"></span>
                        <span className="leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

declare global {
  interface Window {
    html2canvas: (element: HTMLElement, options?: object) => Promise<HTMLCanvasElement>;
  }
}

export default function CourseScheduleApp() {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [screenshotStatus, setScreenshotStatus] = useState<'idle' | 'loading' | 'copied' | 'downloaded' | 'error'>('idle');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.html2canvas) {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        script.async = true;
        document.body.appendChild(script);
    }
  }, []);

  const handleScreenshot = async () => {
    if (!window.html2canvas || !contentRef.current) {
        alert("组件正在加载中，请稍后几秒再试...");
        return;
    }

    setScreenshotStatus('loading');

    setTimeout(async () => {
        try {
            const canvas = await window.html2canvas(contentRef.current!, {
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                windowWidth: contentRef.current!.scrollWidth + 40,
                windowHeight: contentRef.current!.scrollHeight + 40,
                ignoreElements: (element: Element) => element.classList.contains('no-screenshot')
            });

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    setScreenshotStatus('error');
                    setTimeout(() => setScreenshotStatus('idle'), 3000);
                    return;
                }
                try {
                    const item = new ClipboardItem({ 'image/png': blob });
                    await navigator.clipboard.write([item]);
                    setScreenshotStatus('copied');
                    setTimeout(() => setScreenshotStatus('idle'), 3000);
                } catch {
                    const link = document.createElement('a');
                    link.download = '2026_MMS_Detailed_Schedule.png';
                    link.href = canvas.toDataURL();
                    link.click();
                    setScreenshotStatus('downloaded');
                    setTimeout(() => setScreenshotStatus('idle'), 3000);
                }
            }, 'image/png');
        } catch (error) {
            console.error('Screenshot failed:', error);
            setScreenshotStatus('error');
            setTimeout(() => setScreenshotStatus('idle'), 3000);
        }
    }, 200);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 p-4 md:p-8">
      <div
        ref={contentRef}
        id="schedule-container"
        className="max-w-4xl mx-auto bg-white p-6 sm:p-10 rounded-xl shadow-sm border border-slate-200"
      >

        {/* Header */}
        <header className="mb-10">
            {/* Top Bar with Meeting Info */}
            <div className="bg-cyan-600 text-white p-3 -mx-6 sm:-mx-10 -mt-6 sm:-mt-10 mb-8 rounded-t-xl flex flex-col sm:flex-row justify-between items-center gap-2 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium px-4">
                    <Video size={16} className="text-cyan-100" />
                    <span>上课会议号: </span>
                    <span className="bg-white/20 px-2 py-0.5 rounded font-mono tracking-wide">993-855-9289</span>
                </div>
                <div className="text-xs text-cyan-100 px-4 opacity-90">
                    请提前10分钟进入会议室候课
                </div>
            </div>

            <div className="text-center sm:text-left sm:flex sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-2 text-cyan-600">
                    <GraduationCap className="w-8 h-8" />
                    <span className="font-bold tracking-wider text-sm uppercase">2026 MMS Math</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
                        <span className="text-cyan-600">冬季</span> 课程大纲
                    </h1>

                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center text-slate-500 text-sm">
                        <span className="flex items-center justify-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full">
                            <MapPin size={14} /> 线上 (Tencent Meeting)
                        </span>
                        <span className="flex items-center justify-center gap-1.5 font-semibold text-cyan-700 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-100">
                            <Clock size={14} /> 北京时间 10:10-12:10
                        </span>
                    </div>
                </div>

                <div className="mt-8 sm:mt-0 flex flex-wrap gap-2 justify-center no-screenshot" data-html2canvas-ignore="true">
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                        onClick={() => setView('list')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5
                            ${view === 'list' ? 'bg-white text-cyan-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                        <List size={14} /> 详细列表
                        </button>
                        <button
                        onClick={() => setView('calendar')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5
                            ${view === 'calendar' ? 'bg-white text-cyan-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                        <Calendar size={14} /> 概览日历
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                        onClick={handleScreenshot}
                        disabled={screenshotStatus === 'loading'}
                        className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all flex items-center gap-2 active:scale-95 border
                            ${(screenshotStatus === 'copied' || screenshotStatus === 'downloaded')
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                : screenshotStatus === 'error'
                                ? 'bg-red-50 border-red-200 text-red-600'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                        >
                        {screenshotStatus === 'loading' ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : screenshotStatus === 'copied' ? (
                            <><Check size={16} /> 已复制</>
                        ) : screenshotStatus === 'downloaded' ? (
                            <><Download size={16} /> 已保存</>
                        ) : screenshotStatus === 'error' ? (
                            <>失败</>
                        ) : (
                            <><Camera size={16} /> 截图</>
                        )}
                        </button>

                        <button
                        onClick={generateICS}
                        className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium shadow-md shadow-cyan-200 hover:bg-cyan-700 hover:shadow-lg transition-all flex items-center gap-2 active:scale-95"
                        >
                        <Download size={16} /> 导出日程
                        </button>
                    </div>
                </div>
            </div>
        </header>

        {/* Content Area */}
        <main>
          {view === 'calendar' ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-2 sm:p-4 shadow-sm">
              <MonthGrid year={2026} month={1} events={SCHEDULE_DATA} />
              <MonthGrid year={2026} month={2} events={SCHEDULE_DATA} />
              <div className="text-center text-xs text-gray-400 mt-4 no-screenshot flex items-center justify-center gap-2">
                <FileText size={12} />
                <span>将鼠标悬停在课程块上可查看详细知识点大纲</span>
              </div>
            </div>
          ) : (
            <ListView events={SCHEDULE_DATA} />
          )}
        </main>

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-400 text-sm pb-4 border-t border-slate-100 pt-8">
          <p className="font-semibold text-slate-500">2026 MMS Winter Math Course Schedule</p>
          <p className="mt-1 text-xs text-slate-400">Content Reference: Chapter 7 &amp; 8 (Vector Space &amp; Solid Geometry)</p>
        </footer>

      </div>
    </div>
  );
}
