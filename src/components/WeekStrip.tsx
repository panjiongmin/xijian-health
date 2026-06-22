type WeekStripProps = {
  completedDates: string[];
  selectedDate?: string;
};

const weekLabels = ["日", "一", "二", "三", "四", "五", "六"];

function toLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function WeekStrip({ completedDates, selectedDate }: WeekStripProps) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return {
      key: toLocalDate(date),
      day: date.getDate(),
      label: weekLabels[date.getDay()],
    };
  });

  return (
    <div className="week-strip" aria-label="近七天完成记录">
      {days.map((day) => {
        const completed = completedDates.includes(day.key);
        return (
          <div
            key={day.key}
            className={`week-day${completed ? " completed" : ""}${
              selectedDate === day.key ? " selected" : ""
            }`}
          >
            <span>周{day.label}</span>
            <strong>{day.day}</strong>
            <i aria-label={completed ? "已完成" : "未完成"} />
          </div>
        );
      })}
    </div>
  );
}
