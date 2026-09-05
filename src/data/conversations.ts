import { subDays, subHours, subMinutes } from "date-fns";
import type { Conversation, Message } from "../types";

const now = new Date();
const iso = (d: Date) => d.toISOString();

export const initialConversations: Conversation[] = [
  {
    id: "conv_mensah",
    professionalId: "prof_mensah",
    lastMessage: "Great, let's keep an eye on it and touch base at your follow-up.",
    lastMessageAt: iso(subMinutes(now, 12)),
    unreadCount: 2,
  },
  {
    id: "conv_reyes",
    professionalId: "prof_reyes",
    lastMessage: "The cream should help within a few days — let me know if the rash spreads.",
    lastMessageAt: iso(subHours(now, 5)),
    unreadCount: 0,
  },
  {
    id: "conv_okafor",
    professionalId: "prof_okafor",
    lastMessage: "Sounds good. Try the breathing exercise before bed and we'll check in next week.",
    lastMessageAt: iso(subDays(now, 2)),
    unreadCount: 0,
  },
  {
    id: "conv_kim",
    professionalId: "prof_kim",
    lastMessage: "Feel free to message anytime you have questions about your meal plan.",
    lastMessageAt: iso(subDays(now, 9)),
    unreadCount: 0,
  },
];

export const initialMessages: Message[] = [
  // Dr. Mensah — headache follow-up thread
  {
    id: "msg_mensah_1",
    conversationId: "conv_mensah",
    sender: "professional",
    text: "Hi! Just checking in after our video consultation — how have the headaches been since you started the ibuprofen?",
    timestamp: iso(subDays(now, 1)),
  },
  {
    id: "msg_mensah_2",
    conversationId: "conv_mensah",
    sender: "student",
    text: "Hi Dr. Mensah, they've been much less frequent. Maybe one mild one in the last few days.",
    timestamp: iso(subHours(now, 20)),
  },
  {
    id: "msg_mensah_3",
    conversationId: "conv_mensah",
    sender: "professional",
    text: "That's great progress. Keep tracking your sleep and water intake — those were big factors.",
    timestamp: iso(subHours(now, 19)),
  },
  {
    id: "msg_mensah_4",
    conversationId: "conv_mensah",
    sender: "professional",
    text: "Great, let's keep an eye on it and touch base at your follow-up.",
    timestamp: iso(subMinutes(now, 12)),
  },
  // Dr. Reyes — dermatology thread
  {
    id: "msg_reyes_1",
    conversationId: "conv_reyes",
    sender: "professional",
    text: "Hi! How is the hydrocortisone cream working for the rash on your forearm?",
    timestamp: iso(subHours(now, 6)),
  },
  {
    id: "msg_reyes_2",
    conversationId: "conv_reyes",
    sender: "student",
    text: "It's already looking less red, thank you!",
    timestamp: iso(subHours(now, 5.5)),
  },
  {
    id: "msg_reyes_3",
    conversationId: "conv_reyes",
    sender: "professional",
    text: "The cream should help within a few days — let me know if the rash spreads.",
    timestamp: iso(subHours(now, 5)),
  },
  // Dr. Okafor — mental health thread
  {
    id: "msg_okafor_1",
    conversationId: "conv_okafor",
    sender: "student",
    text: "I've been sleeping a bit better since we last talked.",
    timestamp: iso(subDays(now, 2.2)),
  },
  {
    id: "msg_okafor_2",
    conversationId: "conv_okafor",
    sender: "professional",
    text: "Sounds good. Try the breathing exercise before bed and we'll check in next week.",
    timestamp: iso(subDays(now, 2)),
  },
  // Dr. Kim — nutrition thread
  {
    id: "msg_kim_1",
    conversationId: "conv_kim",
    sender: "professional",
    text: "Here's the meal plan outline we discussed — let me know how the first week goes.",
    timestamp: iso(subDays(now, 9.2)),
  },
  {
    id: "msg_kim_2",
    conversationId: "conv_kim",
    sender: "professional",
    text: "Feel free to message anytime you have questions about your meal plan.",
    timestamp: iso(subDays(now, 9)),
  },
];
