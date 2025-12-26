import React, { useState } from 'react';
import { NavBar, Button, Card, Radio, TextArea, Space, Toast } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';

const UserResponse = () => {
  const navigate = useNavigate();

  // 임시 데이터 (나중에 서버에서 받아올 정보)
  const proposal = {
    title: '신년회 모임',
    slots: [
      { id: '1', date: '2025-01-10', time: '18:00 ~ 21:00' },
      { id: '2', date: '2025-01-11', time: '14:00 ~ 17:00' },
    ],
  };

  // 응답 상태 관리 { 일정ID: { status: '가능', memo: '' } }
  const [responses, setResponses] = useState<any>({});

  const handleSubmit = () => {
    // 모든 일정에 대해 응답했는지 확인 (기획서 필수 조건)
    if (Object.keys(responses).length < proposal.slots.length) {
      Toast.show('모든 일정에 대해 가능 여부를 선택해주세요.');
      return;
    }
    Toast.show('응답이 제출되었습니다!');
    navigate('/calendar');
  };

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: '30px' }}>
      <NavBar onBack={() => navigate(-1)}>약속 응답하기</NavBar>

      <div style={{ padding: '16px' }}>
        <h2 style={{ marginBottom: '20px' }}>"{proposal.title}"</h2>

        {proposal.slots.map((slot) => (
          <Card key={slot.id} title={`${slot.date} ${slot.time}`} style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '12px' }}>
              <Radio.Group onChange={(val) => setResponses({ ...responses, [slot.id]: { ...responses[slot.id], status: val } })}>
                <Space direction="horizontal">
                  <Radio value="available">가능</Radio>
                  <Radio value="maybe">아마도</Radio>
                  <Radio value="unavailable">불가능</Radio>
                </Space>
              </Radio.Group>
            </div>
            <TextArea
              placeholder="메모를 남겨주세요 (선택)"
              rows={2}
              onChange={(val) => setResponses({ ...responses, [slot.id]: { ...responses[slot.id], memo: val } })}
              style={{ background: '#f9f9f9', padding: '8px', borderRadius: '4px' }}
            />
          </Card>
        ))}

        <Button block color="primary" size="large" onClick={handleSubmit} style={{ marginTop: '20px' }}>
          응답 제출 완료
        </Button>
      </div>
    </div>
  );
};

export default UserResponse;
