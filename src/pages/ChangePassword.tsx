import React from 'react';
import { Form, Input, Button, NavBar, Toast } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';

const ChangePassword = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    const { currentPassword, newPassword, confirmPassword } = values;

    // [기획 로직] 비밀번호 일치 확인
    if (newPassword !== confirmPassword) {
      Toast.show({
        content: '새 비밀번호가 일치하지 않습니다.',
        icon: 'fail',
      });
      return;
    }

    // [기획 로직] 기존 비밀번호와 동일한지 확인 (보안)
    if (currentPassword === newPassword) {
      Toast.show({
        content: '기존 비밀번호와 다른 비밀번호를 사용해주세요.',
        icon: 'fail',
      });
      return;
    }

    Toast.show({
      content: '비밀번호가 성공적으로 변경되었습니다.',
      icon: 'success',
    });

    // 변경 후 프로필 화면으로 복귀
    setTimeout(() => navigate('/profile'), 1500);
  };

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      <NavBar onBack={() => navigate(-1)}>비밀번호 변경</NavBar>

      <div style={{ padding: '24px 16px' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          footer={
            <Button block type="submit" color="primary" size="large" style={{ marginTop: '20px' }}>
              비밀번호 변경하기
            </Button>
          }
        >
          <Form.Item name="currentPassword" label="현재 비밀번호" rules={[{ required: true, message: '현재 비밀번호를 입력해주세요' }]}>
            <Input type="password" placeholder="현재 비밀번호 입력" clearable />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="새 비밀번호"
            rules={[
              { required: true, message: '새 비밀번호를 입력해주세요' },
              { min: 6, message: '최소 6자리 이상 입력해주세요' },
            ]}
          >
            <Input type="password" placeholder="새 비밀번호 입력 (6자리 이상)" clearable />
          </Form.Item>

          <Form.Item name="confirmPassword" label="새 비밀번호 확인" rules={[{ required: true, message: '비밀번호를 한 번 더 입력해주세요' }]}>
            <Input type="password" placeholder="새 비밀번호 다시 입력" clearable />
          </Form.Item>
        </Form>

        <div style={{ marginTop: '16px', color: '#999', fontSize: '13px', padding: '0 8px' }}>* 개인정보 보호를 위해 비밀번호는 주기적으로 변경하시는 것이 좋습니다.</div>
      </div>
    </div>
  );
};

export default ChangePassword;
