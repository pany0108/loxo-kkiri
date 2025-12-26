import React from 'react';
import { Form, Input, Button, Toast } from 'antd-mobile';
import { validatePassword } from '../utils/validation'; // 앞서 만든 검증 함수

const Signup = () => {
  const [form] = Form.useForm();

  // 아이디 금칙어 리스트
  const forbiddenIds = ['admin', 'root', 'master', 'support'];

  const onFinish = (values: any) => {
    console.log('회원가입 데이터:', values);
    Toast.show({ content: '회원가입이 완료되었습니다!', icon: 'success' });
  };

  return (
    <div style={{ padding: '20px', background: '#fff', minHeight: '100vh' }}>
      <h2>슈퍼 스케줄러 시작하기</h2>
      <Form
        form={form}
        onFinish={onFinish}
        footer={
          <Button block type="submit" color="primary" size="large">
            회원가입
          </Button>
        }
      >
        <Form.Header>필수 정보 입력</Form.Header>

        {/* 아이디 설정 */}
        <Form.Item
          name="id"
          label="아이디"
          rules={[
            { required: true, message: '아이디를 입력해주세요' },
            { pattern: /^[a-z0-9_-]+$/, message: '영문 소문자, 숫자, -, _만 가능합니다.' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (forbiddenIds.includes(value)) {
                  return Promise.reject(new Error('사용할 수 없는 아이디입니다.'));
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <Input placeholder="영문 소문자, 숫자 조합" />
        </Form.Item>

        {/* 비밀번호 설정 */}
        <Form.Item
          name="password"
          label="비밀번호"
          rules={[
            { required: true, message: '비밀번호를 입력해주세요' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                const userId = getFieldValue('id');
                const result = validatePassword(value, userId, {});
                return result === true ? Promise.resolve() : Promise.reject(new Error(result));
              },
            }),
          ]}
        >
          <Input type="password" placeholder="10자 이상, 영문/숫자/특수문자 조합" clearable />
        </Form.Item>

        <Form.Item name="name" label="이름" rules={[{ required: true }]}>
          <Input placeholder="한글 이름 입력" />
        </Form.Item>

        <Form.Item name="nickname" label="닉네임" rules={[{ required: true }]}>
          <Input placeholder="최대 16자 (고유 태그 자동 부여)" />
        </Form.Item>

        <Form.Item name="phone" label="휴대폰 번호" rules={[{ required: true }]}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Input placeholder="###-####-####" />
            <Button size="mini" color="primary" fill="outline">
              인증
            </Button>
          </div>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Signup;
