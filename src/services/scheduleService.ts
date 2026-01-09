import { collection, query, where, doc, serverTimestamp, WriteBatch, DocumentReference, DocumentData } from 'firebase/firestore';
import { db } from '../firebase';
import { addDocument, updateDocument, deleteDocument } from './firestoreService';

// This type should ideally be in a central types file (e.g., 'types/schedule.ts')
export interface ScheduleData {
  title: string;
  content?: string;
  location?: string;
  calendarId: string;
  color: string;
  isAllDay: boolean;
  start: string;
  end: string | null;
  attendees: string[];
  createdBy: string;
}

/**
 * Creates a new schedule document.
 * Timestamps are added automatically by the firestoreService.
 * @param scheduleData The data for the new schedule.
 * @returns The ID of the newly created schedule.
 */
export const createSchedule = async (scheduleData: ScheduleData): Promise<string> => {
  const docRef = await addDocument('schedules', scheduleData);
  return docRef.id;
};

/**
 * Adds a 'create schedule' operation to a Firestore batch.
 * @param batch The Firestore WriteBatch instance.
 * @param scheduleData The data for the new schedule.
 * @returns The DocumentReference for the new schedule.
 */
export const createScheduleInBatch = (batch: WriteBatch, scheduleData: ScheduleData): DocumentReference<DocumentData> => {
  const scheduleRef = doc(collection(db, 'schedules'));
  batch.set(scheduleRef, {
    ...scheduleData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return scheduleRef;
};

/**
 * Updates an existing schedule.
 * `updatedAt` is added automatically by the firestoreService.
 * @param scheduleId The ID of the schedule to update.
 * @param data The data to update.
 */
export const updateSchedule = async (scheduleId: string, data: Partial<ScheduleData>): Promise<void> => {
  await updateDocument('schedules', scheduleId, data);
};

/**
 * Deletes a schedule.
 * @param scheduleId The ID of the schedule to delete.
 */
export const deleteSchedule = async (scheduleId: string): Promise<void> => {
  await deleteDocument('schedules', scheduleId);
};

/**
 * Returns a query for fetching all schedules a user is an attendee of.
 * @param userId The user's ID.
 * @returns A Firestore Query object.
 */
export const getSchedulesForUserQuery = (userId: string) => {
  return query(collection(db, 'schedules'), where('attendees', 'array-contains', userId));
};
