import React, { useState } from 'react';
import { NavBar, List, Avatar, SearchBar, Button, Toast } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { UserPlus, UserMinus } from 'lucide-react';

const FriendList = () => {
  const navigate = useNavigate();

  // 기획 반영: 닉네임 + 고유 태그(#1234) 형태의 가상 데이터
  const [friends, setFriends] = useState([
    { id: '1', name: '김철수', tag: '#1234', profile: '' },
    { id: '2', name: '박지성', tag: '#9988', profile: '' },
    { id: '3', name: '이영희', tag: '#4321', profile: '' },
    { id: '4', name: '강호동', tag: '#1111', profile: '' },
  ]);

  // [기획 핵심] ㄱㄴㄷ 순 정렬 로직
  const sortedFriends = [...friends].sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  const handleDelete = (id: string) => {
    setFriends(friends.filter((f) => f.id !== id));
    Toast.show('친구가 목록에서 삭제되었습니다.');
  };

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      <NavBar onBack={() => navigate(-1)} right={<UserPlus size={22} onClick={() => Toast.show('친구 추가 기능 준비 중')} />}>
        친구 목록 편집
      </NavBar>

      <div style={{ padding: '12px', background: '#fff' }}>
        <SearchBar placeholder="이름 또는 #태그 검색" />
      </div>

      <List header={`내 친구 (${friends.length}명)`}>
        {sortedFriends.map((friend) => (
          <List.Item
            key={friend.id}
            prefix={<Avatar src={friend.profile} style={{ '--size': '48px', borderRadius: '12px' }} />}
            description={friend.tag}
            extra={
              <Button size="mini" color="danger" fill="none" onClick={() => handleDelete(friend.id)}>
                <UserMinus size={18} />
              </Button>
            }
          >
            {friend.name}
          </List.Item>
        ))}
      </List>

      <div style={{ padding: '16px', color: '#999', fontSize: '12px' }}>* 친구를 삭제해도 기존에 공유된 캘린더의 일정은 유지됩니다.</div>
    </div>
  );
};

export default FriendList;
