import React from 'react';
import { NavBar, Tag, Card, Button, Toast } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

const MeetingReport = () => {
  const navigate = useNavigate();

  const reportData = [
    {
      id: 'slot1',
      date: '2025-01-10',
      time: '18:00 ~ 21:00',
      available: ['김철수', '이영희', '박지성'],
      maybe: ['홍길동'],
      unavailable: [],
      isBest: true,
    },
    {
      id: 'slot2',
      date: '2025-01-11',
      time: '14:00 ~ 17:00',
      available: ['김철수', '이영희'],
      maybe: [],
      unavailable: ['박지성', '홍길동'],
      isBest: false,
    },
  ];

  const handleConfirm = (slot: any) => {
    Toast.show({
      content: '약속이 확정되었습니다!',
      icon: 'success',
    });
    // 확정 후 캘린더 메인으로 이동
    setTimeout(() => navigate('/calendar'), 1500);
  };

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: '40px' }}>
      <NavBar onBack={() => navigate(-1)}>응답 결과 리포트</NavBar>

      <div style={{ padding: '16px' }}>
        <h3 style={{ marginBottom: '16px' }}>가장 적절한 시간을 선택하세요</h3>

        {reportData.map((slot) => (
          <Card
            key={slot.id}
            // 에러 해결: 'header' 대신 'title' 사용
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span>
                  {slot.date} {slot.time}
                </span>
                {slot.isBest && <Tag color="success">추천 (모두 가능)</Tag>}
              </div>
            }
            style={{
              marginBottom: '16px',
              borderRadius: '12px',
              border: slot.isBest ? '2px solid #00b578' : '1px solid #eee',
            }}
          >
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#00b578' }}>
                <CheckCircle2 size={16} />
                <span style={{ fontSize: '14px' }}>가능: {slot.available.join(', ')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#ff8f1f' }}>
                <AlertCircle size={16} />
                <span style={{ fontSize: '14px' }}>아마도: {slot.maybe.join(', ') || '없음'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#ff3141' }}>
                <XCircle size={16} />
                <span style={{ fontSize: '14px' }}>불가능: {slot.unavailable.join(', ') || '없음'}</span>
              </div>

              <Button block color="primary" fill={slot.isBest ? 'solid' : 'outline'} onClick={() => handleConfirm(slot)}>
                이 시간으로 확정하기
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MeetingReport;
