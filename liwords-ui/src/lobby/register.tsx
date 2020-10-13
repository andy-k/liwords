import React, { useState } from 'react';
import axios from 'axios';
import { TopBar } from '../topbar/topbar';
import { Input, Form, Button, Alert, Checkbox } from 'antd';
import { toAPIUrl } from '../api/api';
import './registration.scss';
import woogles from '../assets/woogles.png';

export const Register = () => {
  const [err, setErr] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  const onFinish = (values: { [key: string]: string }) => {
    axios
      .post(toAPIUrl('user_service.RegistrationService', 'Register'), {
        username: values.username,
        password: values.password,
        email: values.email,
        registrationCode: values.registrationCode,
      })
      .then(() => {
        // Try logging in after registering.
        axios
          .post(
            toAPIUrl('user_service.AuthenticationService', 'Login'),
            {
              username: values.username,
              password: values.password,
            },
            { withCredentials: true }
          )
          .then(() => {
            // Automatically will set cookie
            setLoggedIn(true);
          })
          .catch((e) => {
            if (e.response) {
              // From Twirp
              setErr(e.response.data.msg);
            } else {
              setErr('unknown error, see console');
              console.log(e);
            }
          });
      })
      .catch((e) => {
        if (e.response) {
          // From Twirp
          setErr(e.response.data.msg);
        } else {
          setErr('unknown error, see console');
          console.log(e);
        }
      });
  };

  if (loggedIn) {
    window.location.replace('/');
  }

  return (
    <>
      <TopBar />
      <div className="registration">
        <img src={woogles} className="woogles" alt="Woogles" />
        <div className="registration-form">
          <h3>Welcome to Woogles!</h3>
          <p>
            Welcome to Woogles, the online home for word games! If you want to
            be the champion of crossword game, or maybe just want to find a
            friendly match you’re in the right place.
          </p>
          <p>- Woogles and team</p>
          <Form layout="inline" name="login" onFinish={onFinish}>
            <Form.Item
              name="email"
              rules={[
                {
                  required: true,
                  message:
                    'Please input your email. We promise not to spam you.',
                },
              ]}
            >
              <Input placeholder="Email address" />
            </Form.Item>
            <Form.Item
              name="username"
              rules={[
                {
                  required: true,
                  message: 'Please input your username!',
                },
              ]}
            >
              <Input placeholder="Username" />
            </Form.Item>

            <Form.Item
              name="password"
              className="password"
              rules={[
                {
                  required: true,
                  message: 'Please input your password!',
                },
              ]}
            >
              <Input.Password placeholder="Password" />
            </Form.Item>

            <Form.Item
              name="registrationCode"
              rules={[
                {
                  required: true,
                  message: 'You need a registration code.',
                },
              ]}
            >
              <Input placeholder="Secret code" />
            </Form.Item>

            <Form.Item
              rules={[
                {
                  required: true,
                  message: 'You must agree to this condition',
                  transform: (value) => value || undefined,
                  type: 'boolean',
                },
              ]}
              valuePropName="checked"
              initialValue={false}
              name="nocheating"
            >
              <Checkbox>
                I promise not to use word finders or game analyzers without the
                express permission of my opponent.
              </Checkbox>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit">
                Continue
              </Button>
            </Form.Item>
          </Form>
          {err !== '' ? <Alert message={err} type="error" /> : null}
        </div>
      </div>
    </>
  );
};
