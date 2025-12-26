import React, { useState } from 'react';
import { Button, List, Toast, NavBar, Calendar } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const ProposeMeeting = () => {
  const navigate = useNavigate();
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  // 수정된 부분: val이 Date일 수도 있고, null일 수도 있음을 명시 (TypeScript 에러 방지)
  const onDateChange = (val: Date | [Date, Date] | null) => {
    // 1. 아무것도 선택 안 되었거나 범위 선택([Date, Date])인 경우는 무시
    if (!val || Array.isArray(val)) return;

    // 2. 이제 val은 확실히 단일 Date 객체입니다.
    const dateStr = dayjs(val).format('YYYY-MM-DD');

    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter((d) => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr]);
    }
  };

  const onConfirm = () => {
    if (selectedDates.length === 0) {
      Toast.show('최소 하나 이상의 후보 날짜를 선택해주세요.');
      return;
    }
    navigate('/propose-detail', {
      state: { selectedDates: selectedDates.sort() },
    });
  };

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      <NavBar onBack={() => navigate(-1)}>약속 제안하기</NavBar>

      <div style={{ padding: '16px' }}>
        <h3>1. 후보 날짜 선택 (다중 선택 가능)</h3>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '10px' }}>
          <Calendar
            // selectionMode를 명시적으로 'single'로 두어 충돌을 방지합니다.
            selectionMode="single"
            onChange={onDateChange}
            renderLabel={(date) => {
              const dateStr = dayjs(date).format('YYYY-MM-DD');
              return selectedDates.includes(dateStr) ? <div style={{ color: '#1677ff', fontSize: '10px', fontWeight: 'bold' }}>선택됨</div> : null;
            }}
          />
        </div>

        <h3 style={{ marginTop: '20px' }}>2. 선택된 날짜 리스트</h3>
        <List>
          {selectedDates.length === 0 ? (
            <List.Item disabled>달력에서 날짜를 클릭하세요.</List.Item>
          ) : (
            selectedDates.sort().map((dateStr) => (
              <List.Item
                key={dateStr}
                extra={
                  <Button size="mini" color="danger" fill="none" onClick={() => setSelectedDates(selectedDates.filter((d) => d !== dateStr))}>
                    삭제
                  </Button>
                }
              >
                {dayjs(dateStr).format('YYYY년 MM월 DD일')}
              </List.Item>
            ))
          )}
        </List>

        <div style={{ marginTop: '30px' }}>
          <Button block color="primary" size="large" onClick={onConfirm}>
            다음 단계 (시간 설정)
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProposeMeeting;
