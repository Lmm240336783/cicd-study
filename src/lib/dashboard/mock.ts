export type Tone = "blue" | "green" | "orange" | "red" | "purple" | "cyan";

export type QuickAction = {
  key: string;
  title: string;
  description: string;
  tone: Tone;
};

export type ReminderItem = {
  label: string;
  value: string;
  highlight?: boolean;
};

export type PromotionCard = {
  key: string;
  title: string;
  description: string;
  actionText: string;
  gradientClassName: string;
};

export const quickActions: QuickAction[] = [
  { key: "signup", title: "新线索录入", description: "手动录入新咨询线索并分配负责人。", tone: "blue" },
  { key: "activity", title: "活动排期", description: "维护本周招生活动日历与触达计划。", tone: "orange" },
  { key: "schedule", title: "排课巡检", description: "快速检查今日排课冲突与空档时段。", tone: "green" },
  { key: "follow", title: "回访提醒", description: "处理今日待回访名单并登记反馈。", tone: "purple" },
  { key: "transfer", title: "顾问转派", description: "根据线索热度调整顾问分配权重。", tone: "cyan" },
  { key: "alarm", title: "风险预警", description: "查看退费/续费异常的风险学员。", tone: "red" },
];

export const reminders: ReminderItem[] = [
  { label: "今日未点名班级", value: "6", highlight: true },
  { label: "待处理家长咨询", value: "11" },
  { label: "本周到期合同", value: "8", highlight: true },
  { label: "待回访试听课", value: "23" },
];

export const promotions: PromotionCard[] = [
  {
    key: "xly",
    title: "夏令营项目",
    description: "面向 K9 的沉浸式项目班正在开放报名，支持一键分发海报。",
    actionText: "查看项目",
    gradientClassName: "bg-gradient-to-br from-blue-500 to-cyan-500",
  },
  {
    key: "stm",
    title: "师训计划",
    description: "本月教学教研主题班会已经排期，支持按校区同步推送。",
    actionText: "查看日程",
    gradientClassName: "bg-gradient-to-br from-emerald-500 to-teal-500",
  },
  {
    key: "vip",
    title: "续费冲刺",
    description: "高价值学员续费提醒已生成，建议今日完成重点沟通。",
    actionText: "查看名单",
    gradientClassName: "bg-gradient-to-br from-violet-500 to-fuchsia-500",
  },
];

export const helpLinks = ["如何创建校区活动模板", "如何配置试听课回访链路", "如何查看老师课后点评统计", "如何导出经营报表"];
