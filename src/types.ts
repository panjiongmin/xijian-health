export type User = {
    id: string;
    email: string;
    displayName: string;
    avatarCode: string;
    avatarUrl: string | null;
    createdAt: string;
    role: "admin" | "member";
};
export type TaskImage = {
    id: string;
    url: string;
};
export type Task = {
    id: string;
    title: string;
    description: string;
    imagePolicy: "none" | "optional" | "required";
    checkinId: string | null;
    completedAt: string | null;
    images: TaskImage[];
};
export type ManagedTask = Pick<Task, "id" | "title" | "description" | "imagePolicy"> & {
    weekdayMask: number;
    active: number;
};
export type TodayData = {
    date: string;
    tasks: Task[];
    reminderTime: string | null;
};
export type Notifications = {
    enabled: boolean;
    bound: boolean;
    available: boolean;
    remindersEnabled: boolean;
    reminderTime: string;
};
export type ReminderConfig = {
    enabled: boolean;
    reminderTime: string;
    siteUrl: string;
    configured: {
        token: boolean;
        secretKey: boolean;
        callbackSecret: boolean;
    };
    callbackUrl: string | null;
};
export type Member = {
    id: string;
    displayName: string;
    email: string;
    tasks: Task[];
    reminder: {
        status: string;
        errorCode: string | null;
    } | null;
};
