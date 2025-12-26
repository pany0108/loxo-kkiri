import React, { useState } from 'react';
import { NavBar, Form, Input, Selector, Button, Toast } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';

const CreateCalendar = () => {
  const navigate = useNavigate();

  // 친구 목록 예시 (나중에 친구 관리 기능과 연동)
  const friendsOptions = [
    { label: '김철수', value: '김철수' },
    { label: '이영희', value: '이영희' },
    { label: '박지성', value: '박지성' },
  ];

  const onFinish = (values: any) => {
    // [기획 반영] 이름이 없으면 공유 대상 이름들로 자동 설정
    let calendarName = values.name;
    if (!calendarName && values.members && values.members.length > 0) {
      calendarName = `${values.members.join(', ')}의 캘린더`;
    }

    if (!calendarName) {
      Toast.show('캘린더 이름을 입력하거나 친구를 선택하세요.');
      return;
    }

    Toast.show(`'${calendarName}' 가 생성되었습니다!`);
    navigate('/calendar');
  };

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      <NavBar onBack={() => navigate(-1)}>공유 캘린더 만들기</NavBar>

      <Form
        layout="vertical"
        onFinish={onFinish}
        footer={
          <Button block type="submit" color="primary" size="large">
            생성하기
          </Button>
        }
      >
        <Form.Item name="name" label="캘린더 이름" help="입력하지 않으면 친구 이름으로 자동 설정됩니다.">
          <Input placeholder="예: 우리 가족 모임" />
        </Form.Item>

        <Form.Item name="members" label="공유할 친구 선택 (다수 가능)">
          <Selector
            columns={3}
            multiple // [기획 반영] 다수 선택 가능
            options={friendsOptions}
          />
        </Form.Item>

        <Form.Item label="권한 정보" disabled>
          <div style={{ fontSize: '12px', color: '#888' }}>
            * 모든 멤버가 일정 등록/보기가 가능합니다.
            <br />* 일정 수정/삭제는 등록한 본인만 가능합니다.
          </div>
        </Form.Item>
      </Form>
    </div>
  );
};

export default CreateCalendar;
