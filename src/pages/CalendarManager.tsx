import React, { useState } from 'react';
import { NavBar, List, Button, SwipeAction, Toast, Tag } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Settings2, Trash2 } from 'lucide-react';

const CalendarManager = () => {
  const navigate = useNavigate();

  // 가상의 공유 캘린더 목록 데이터
  const [calendars, setCalendars] = useState([
    { id: '1', name: '가족 공유 캘린더', members: ['나', '엄마', '아빠'], isDefault: true },
    { id: '2', name: '신년회 모임', members: ['나', '김철수', '이영희', '박지성'], isDefault: false },
    { id: '3', name: '데브 프로젝트', members: ['나', '팀장님', '에디'], isDefault: false },
  ]);

  const handleDelete = (id: string) => {
    setCalendars(calendars.filter((cal) => cal.id !== id));
    Toast.show('캘린더가 삭제되었습니다.');
  };

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      <NavBar onBack={() => navigate(-1)} right={<Plus size={24} onClick={() => navigate('/create-calendar')} />}>
        캘린더 관리
      </NavBar>

      <div style={{ padding: '16px' }}>
        <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>
          * 캘린더를 옆으로 밀어 삭제하거나 수정할 수 있습니다.
          <br />* 공유 캘린더의 일정은 본인이 등록한 것만 수정/삭제 가능합니다.
        </p>

        <List header="참여 중인 캘린더">
          {calendars.map((cal) => (
            <SwipeAction
              key={cal.id}
              rightActions={[
                {
                  key: 'edit',
                  text: '수정',
                  color: 'primary',
                  onClick: () => navigate(`/edit-calendar/${cal.id}`),
                },
                {
                  key: 'delete',
                  text: '삭제',
                  color: 'danger',
                  onClick: () => handleDelete(cal.id),
                },
              ]}
            >
              <List.Item
                prefix={<Users size={20} color="#1677ff" />}
                description={`멤버: ${cal.members.join(', ')}`}
                extra={
                  cal.isDefault && (
                    <Tag color="primary" fill="outline">
                      기본
                    </Tag>
                  )
                }
                onClick={() => {
                  Toast.show(`${cal.name}로 전환되었습니다.`);
                  navigate('/calendar');
                }}
              >
                {cal.name}
              </List.Item>
            </SwipeAction>
          ))}
        </List>

        <div style={{ marginTop: '24px' }}>
          <Button block color="primary" fill="outline" onClick={() => navigate('/create-calendar')}>
            <Plus size={18} style={{ verticalAlign: 'middle', marginRight: '4px' }} />새 공유 캘린더 만들기
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CalendarManager;
