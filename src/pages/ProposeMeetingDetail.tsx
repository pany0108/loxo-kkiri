import React, { useState } from 'react';
import { NavBar, Button, List, SwipeAction, Toast } from 'antd-mobile';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { Plus, Trash2 } from 'lucide-react';

const ProposeMeetingDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 이전 페이지에서 넘겨받은 날짜들
  const initialDates = location.state?.selectedDates || [];

  // 날짜별 시간 슬롯 관리
  const [timeSlots, setTimeSlots] = useState<any>(
    initialDates.reduce((acc: any, dateStr: string) => {
      acc[dateStr] = [{ start: '09:00', end: '18:00' }];
      return acc;
    }, {}),
  );

  const handleAddSlot = (dateStr: string) => {
    setTimeSlots({
      ...timeSlots,
      [dateStr]: [...timeSlots[dateStr], { start: '19:00', end: '22:00' }],
    });
  };

  const handleDeleteSlot = (dateStr: string, index: number) => {
    const newSlots = [...timeSlots[dateStr]];
    newSlots.splice(index, 1);
    setTimeSlots({
      ...timeSlots,
      [dateStr]: newSlots,
    });
  };

  const handleFinalConfirm = () => {
    Toast.show({
      content: '약속 제안이 생성되었습니다!',
      icon: 'success',
    });
    // 다음 단계: 친구 초대 페이지 또는 캘린더로 이동
    setTimeout(() => navigate('/calendar'), 1500);
  };

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: '40px' }}>
      <NavBar onBack={() => navigate(-1)}>상세 시간 설정</NavBar>

      <div style={{ padding: '16px' }}>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>선택하신 날짜별로 가능한 후보 시간을 추가해 주세요. (옆으로 밀어서 삭제)</p>

        {initialDates.map((dateStr: string) => (
          <div key={dateStr} style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>{dayjs(dateStr).format('YYYY년 MM월 DD일 (ddd)')}</h3>
            <List>
              {timeSlots[dateStr]?.map((slot: any, index: number) => (
                <SwipeAction
                  key={index}
                  rightActions={[
                    {
                      key: 'delete',
                      text: (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Trash2 size={16} /> 삭제
                        </div>
                      ),
                      color: 'danger',
                      onClick: () => handleDeleteSlot(dateStr, index),
                    },
                  ]}
                >
                  <List.Item
                    extra={
                      <div style={{ color: '#1677ff', fontWeight: 'bold' }}>
                        {slot.start} ~ {slot.end}
                      </div>
                    }
                  >
                    후보 {index + 1}
                  </List.Item>
                </SwipeAction>
              ))}
              <List.Item>
                <Button block fill="none" size="small" onClick={() => handleAddSlot(dateStr)} style={{ color: '#1677ff', '--text-color': '#1677ff' }}>
                  <Plus size={14} style={{ marginRight: '4px' }} /> 시간 추가
                </Button>
              </List.Item>
            </List>
          </div>
        ))}

        <Button block color="primary" size="large" onClick={handleFinalConfirm} style={{ marginTop: '20px' }}>
          약속 제안 완료
        </Button>
      </div>
    </div>
  );
};

export default ProposeMeetingDetail;
