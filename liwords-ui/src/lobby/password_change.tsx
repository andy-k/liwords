import React, { useState } from 'react';

import { Form, Input, Button, Alert, notification, Row, Col } from 'antd';
// import { Link } from 'react-router-dom';
import axios from 'axios';
import { TopBar } from '../topbar/topbar';
import { toAPIUrl } from '../api/api';

const layout = {
  labelCol: {
    span: 8,
  },
  wrapperCol: {
    span: 12,
  },
};
const tailLayout = {
  wrapperCol: {
    offset: 8,
    span: 12,
  },
};

type Props = {};

export const PasswordChange = (props: Props) => {
  const stillMountedRef = React.useRef(true);
  React.useEffect(() => () => void (stillMountedRef.current = false), []);

  const [err, setErr] = useState('');
  const onFinish = (values: { [key: string]: string }) => {
    if (values.newPassword !== values.confirmnewPassword) {
      if (stillMountedRef.current) {
        setErr('New passwords must match');
      }
      return;
    }

    axios
      .post(
        toAPIUrl('user_service.AuthenticationService', 'ChangePassword'),
        {
          oldPassword: values.oldPassword,
          newPassword: values.newPassword,
        },
        {
          withCredentials: true,
        }
      )
      .then(() => {
        notification.info({
          message: 'Success',
          description: 'Your password was changed.',
        });
        if (stillMountedRef.current) {
          setErr('');
        }
      })
      .catch((e) => {
        if (e.response) {
          // From Twirp
          if (stillMountedRef.current) {
            setErr(e.response.data.msg);
          }
        } else {
          if (stillMountedRef.current) {
            setErr('unknown error, see console');
          }
          console.log(e);
        }
      });
  };

  return (
    <>
      <Row>
        <Col span={24}>
          <TopBar />
        </Col>
      </Row>
      <Form
        {...layout}
        name="changepassword"
        onFinish={onFinish}
        style={{ marginTop: 20 }}
      >
        <Form.Item
          label="Old Password"
          name="oldPassword"
          rules={[
            {
              required: true,
              message: 'Please input your old password!',
            },
          ]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          label="New Password"
          name="newPassword"
          rules={[
            {
              required: true,
              message: 'Please input your new password!',
            },
          ]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          label="Confirm New Password"
          name="confirmnewPassword"
          rules={[
            {
              required: true,
              message: 'Please confirm your new password!',
            },
          ]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item {...tailLayout}>
          <Button type="primary" htmlType="submit">
            Submit
          </Button>
        </Form.Item>
      </Form>
      {err !== '' ? <Alert message={err} type="error" /> : null}
    </>
  );
};
