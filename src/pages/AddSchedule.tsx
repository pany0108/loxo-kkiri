import React, { useState } from 'react';
import { Form, Input, Button, DatePicker, Switch, TextArea, Toast, ImageUploader, NavBar } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const AddSchedule = () => {
  const navigate = useNavigate();
  const [isAllDay, setIsAllDay] = useState(false);

  const onFinish = (values: any) => {
    // 날짜 유효성 검사
    if (values.start && values.end && dayjs(values.end).isBefore(dayjs(values.start))) {
      Toast.show({ content: '종료 시간이 시작보다 빠를 수 없습니다.', position: 'bottom' });
      return;
    }

    console.log('등록 데이터:', values);
    Toast.show({ content: '일정이 등록되었습니다!', icon: 'success' });
    setTimeout(() => navigate('/calendar'), 1500); // 토스트를 보여줄 시간을 줌
  };

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      <NavBar onBack={() => navigate(-1)}>일정 추가</NavBar>

      <Form
        layout="vertical"
        onFinish={onFinish}
        footer={
          <Button block type="submit" color="primary" size="large">
            등록하기
          </Button>
        }
      >
        <Form.Item name="title" label="제목" rules={[{ required: true, message: '제목은 필수입니다' }]}>
          <Input placeholder="일정 제목" />
        </Form.Item>

        <Form.Item label="종일" childElementPosition="right">
          <Switch checked={isAllDay} onChange={setIsAllDay} />
        </Form.Item>

        <Form.Item name="start" label="시작 시간" rules={[{ required: true }]}>
          <DatePicker precision={isAllDay ? 'day' : 'minute'}>
            {(value) => (value ? dayjs(value).format(isAllDay ? 'YYYY/MM/DD' : 'YYYY/MM/DD HH:mm') : '날짜를 선택하세요')}
          </DatePicker>
        </Form.Item>

        <Form.Item name="end" label="종료 시간" rules={[{ required: true }]}>
          <DatePicker precision={isAllDay ? 'day' : 'minute'}>
            {(value) => (value ? dayjs(value).format(isAllDay ? 'YYYY/MM/DD' : 'YYYY/MM/DD HH:mm') : '날짜를 선택하세요')}
          </DatePicker>
        </Form.Item>

        <Form.Item name="location" label="장소">
          <Input placeholder="장소 입력" />
        </Form.Item>

        <Form.Item name="content" label="내용">
          <TextArea placeholder="상세 내용" rows={3} />
        </Form.Item>

        <Form.Item name="files" label="첨부파일">
          <ImageUploader upload={async (file) => ({ url: URL.createObjectURL(file) })} />
        </Form.Item>
      </Form>
    </div>
  );
};

export default AddSchedule;
