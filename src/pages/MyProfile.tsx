import React, { useState } from 'react';
import { NavBar, List, Avatar, Button, Input, Switch, Toast, Modal } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const MyProfile = () => {
  const navigate = useNavigate();

  // 상태 관리
  const [nickname, setNickname] = useState('사용자닉네임');
  const [lastChanged, setLastChanged] = useState('2025-12-01'); // 마지막 변경일 예시
  const [isPushOn, setIsPushOn] = useState(true);

  // [기획 반영] 닉네임 수정 로직 (1달 제한)
  const handleNicknameChange = () => {
    const today = dayjs();
    const lastDate = dayjs(lastChanged);
    const diffMonth = today.diff(lastDate, 'month');

    if (diffMonth < 1) {
      Toast.show({ content: '닉네임 변경은 1달에 한 번만 가능합니다.', icon: 'fail' });
    } else {
      Modal.confirm({
        content: <Input value={nickname} onChange={(val) => setNickname(val)} />,
        onConfirm: () => {
          setLastChanged(today.format('YYYY-MM-DD'));
          Toast.show('닉네임이 변경되었습니다.');
        },
      });
    }
  };

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      <NavBar back="뒤로" onBack={() => navigate(-1)}>
        내 정보
      </NavBar>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', background: '#fff' }}>
        <Avatar src="" style={{ '--size': '80px', marginBottom: '12px' }} />
        <Button size="small" fill="outline">
          이미지 설정
        </Button>
      </div>

      <List header="계정 설정">
        <List.Item extra={nickname} onClick={handleNicknameChange}>
          닉네임 수정
        </List.Item>
        <List.Item onClick={() => navigate('/friend-list')}>친구 목록 편집 (ㄱㄴㄷ 순)</List.Item>
        <List.Item onClick={() => navigate('/change-password')}>비밀번호 변경하기</List.Item>
      </List>

      <List header="알림 설정">
        <List.Item extra={<Switch checked={isPushOn} onChange={setIsPushOn} />}>푸시 알림 수신</List.Item>
      </List>
    </div>
  );
};

export default MyProfile;
