import { collection, query, where, doc, serverTimestamp, WriteBatch, DocumentReference, DocumentData } from 'firebase/firestore';
import { db } from '../firebase';
import { addDocument, updateDocument, deleteDocument } from './firestoreService';

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
 * 새로운 일정 문서를 생성합니다.
 * - firestoreService를 통해 생성 시간(createdAt)이 자동으로 추가됩니다.
 *
 * @param {ScheduleData} scheduleData - 생성할 일정 데이터
 * @returns {Promise<string>} 생성된 일정의 ID
 */
export const createSchedule = async (scheduleData: ScheduleData): Promise<string> => {
  const docRef = await addDocument('schedules', scheduleData);
  return docRef.id;
};

/**
 * Firestore Batch 작업에 '일정 생성' 작업을 추가합니다.
 * - 트랜잭션이나 일괄 처리 시 사용됩니다.
 *
 * @param {WriteBatch} batch - Firestore WriteBatch 인스턴스
 * @param {ScheduleData} scheduleData - 생성할 일정 데이터
 * @returns {DocumentReference<DocumentData>} 생성될 일정의 문서 참조
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
 * 기존 일정을 업데이트합니다.
 * - firestoreService를 통해 수정 시간(updatedAt)이 자동으로 갱신됩니다.
 *
 * @param {string} scheduleId - 업데이트할 일정 ID
 * @param {Partial<ScheduleData>} data - 업데이트할 데이터
 * @returns {Promise<void>}
 */
export const updateSchedule = async (scheduleId: string, data: Partial<ScheduleData>): Promise<void> => {
  await updateDocument('schedules', scheduleId, data);
};

/**
 * 일정을 삭제합니다.
 *
 * @param {string} scheduleId - 삭제할 일정 ID
 * @returns {Promise<void>}
 */
export const deleteSchedule = async (scheduleId: string): Promise<void> => {
  await deleteDocument('schedules', scheduleId);
};

/**
 * 사용자가 참여자로 포함된 모든 일정을 조회하는 쿼리를 반환합니다.
 *
 * @param {string} userId - 사용자 ID
 * @returns {Query} Firestore 쿼리 객체
 */
export const getSchedulesForUserQuery = (userId: string) => {
  return query(collection(db, 'schedules'), where('attendees', 'array-contains', userId));
};
