import React from 'react';
import { Form, Input, Button, Checkbox, Space } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '40px 20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>슈퍼 스케줄러</h1>
      <Form
        layout="vertical"
        footer={
          <Space direction="vertical" block>
            <Button block type="submit" color="primary" size="large">
              로그인
            </Button>
            <Button block fill="none" onClick={() => navigate('/signup')}>
              회원가입
            </Button>
          </Space>
        }
      >
        <Form.Item name="id" label="아이디">
          <Input placeholder="아이디 입력" />
        </Form.Item>
        <Form.Item name="password" label="비밀번호">
          <Input type="password" placeholder="비밀번호 입력" clearable />
        </Form.Item>
        <Form.Item name="remember">
          <Checkbox>로그인 상태 유지</Checkbox>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center', marginTop: '20px', color: '#666', fontSize: '14px' }} onClick={() => navigate('/find-password')}>
        비밀번호를 잊으셨나요?
      </div>
    </div>
  );
};

export default Login;
