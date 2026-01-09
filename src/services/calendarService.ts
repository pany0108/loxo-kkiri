import { User } from 'firebase/auth';
import { collection, query, where, doc, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { getDocuments, addDocument, deleteDocument, createBatch } from './firestoreService';
import { notifyCalendarInvite, notifyCalendarLeave } from './notificationService';
import { CalendarType } from 'contexts';

export interface CreateCalendarData {
  name: string;
  color: string;
  memberUids: string[];
}

/**
 * Creates a new calendar, checking for duplicates with the same members.
 * @param user The current user creating the calendar.
 * @param data The data for the new calendar.
 * @returns The ID of the newly created calendar.
 * @throws An error if a duplicate calendar exists.
 */
export const createCalendar = async (user: User, data: CreateCalendarData): Promise<{ calendarId: string }> => {
  const { name, color, memberUids } = data;
  const newMembers = [user.uid, ...memberUids].sort();

  // 1. Check for duplicate calendar
  const existingCalendars = await getDocuments<CalendarType>('calendars', where('members', '==', newMembers));

  if (existingCalendars.length > 0) {
    const existingCalendarName = existingCalendars[0].name;
    throw new Error(`'${existingCalendarName}' 캘린더가 이미 같은 멤버로 생성되어 있습니다.`);
  }

  // 2. Create new calendar
  const calendarData = {
    name,
    ownerId: user.uid,
    members: newMembers,
    color,
    isDefault: false,
  };
  // addDocument from firestoreService will add timestamps
  const docRef = await addDocument('calendars', calendarData);

  // 3. Send notifications to invited friends
  if (memberUids.length > 0 && user.displayName) {
    const batch = createBatch();
    for (const friendUid of memberUids) {
      await notifyCalendarInvite(batch, {
        friendUid: friendUid,
        inviterName: user.displayName,
        inviterId: user.uid,
        calendarName: name,
        calendarId: docRef.id,
      });
    }
    await batch.commit();
  }

  return { calendarId: docRef.id };
};

/**
 * Deletes a calendar.
 * NOTE: This does not delete associated schedules. That should be handled by a Cloud Function.
 * @param calendarId The ID of the calendar to delete.
 */
export const deleteCalendar = async (calendarId: string): Promise<void> => {
  // TODO: Implement a Cloud Function to delete all associated schedules.
  await deleteDocument('calendars', calendarId);
};

/**
 * Allows a user to leave a shared calendar.
 * If the user is the last member, the calendar is deleted.
 * @param calendar The calendar object to leave.
 * @param user The user who is leaving.
 */
export const leaveCalendar = async (calendar: CalendarType, user: User): Promise<void> => {
  if (calendar.members.length <= 1) {
    await deleteDocument('calendars', calendar.id);
  } else {
    const batch = createBatch();
    const calendarRef = doc(db, 'calendars', calendar.id);

    batch.update(calendarRef, {
      members: arrayRemove(user.uid),
    });

    const remainingMembers = calendar.members.filter((uid) => uid !== user.uid);
    for (const memberId of remainingMembers) {
      await notifyCalendarLeave(batch, {
        memberId: memberId,
        leaverName: user.displayName || '누군가',
        calendarName: calendar.name,
        calendarId: calendar.id,
      });
    }

    await batch.commit();
  }
};

/**
 * Finds a target calendar for a given set of members.
 * 1. Finds a shared calendar with the exact same members.
 * 2. If not found, finds the user's default calendar.
 * @param members An array of member UIDs.
 * @param userId The current user's ID.
 * @returns The found calendar object or null.
 */
export const findTargetCalendarForMembers = async (members: string[], userId: string): Promise<CalendarType | null> => {
  const sortedMembers = [...members].sort();

  const sharedCalendars = await getDocuments<CalendarType>('calendars', where('members', '==', sortedMembers));
  if (sharedCalendars.length > 0) {
    return sharedCalendars[0];
  }

  const defaultCalendars = await getDocuments<CalendarType>('calendars', where('ownerId', '==', userId), where('isDefault', '==', true));
  if (defaultCalendars.length > 0) {
    return defaultCalendars[0];
  }

  return null;
};

// Functions to return query objects for real-time listeners
export const getCalendarsForUserQuery = (userId: string) => {
  return query(collection(db, 'calendars'), where('members', 'array-contains', userId));
};
