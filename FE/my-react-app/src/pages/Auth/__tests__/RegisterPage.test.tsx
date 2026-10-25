// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RegisterPage from '../RegisterPage';

const mocks = vi.hoisted(() => ({ register: vi.fn().mockResolvedValue({}), upload: vi.fn() }));
vi.mock('@/hooks/api/useAuth', () => ({ useAuth: () => ({ register: mocks.register }) }));
vi.mock('@/utils/helpers/upload.helpers', () => ({ uploadImageToCloudinary: mocks.upload }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('registers without uploading an optional avatar', async () => {
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  const view = render(<MemoryRouter initialEntries={['/auth/register']}><Routes>
    <Route path="/auth/register" element={<RegisterPage />} />
    <Route path="/auth/login" element={<div>Login destination</div>} />
  </Routes></MemoryRouter>);
  fireEvent.change(view.getByPlaceholderText('Họ và tên đầy đủ'), { target: { value: 'New User' } });
  fireEvent.change(view.getByPlaceholderText('Username'), { target: { value: 'newuser' } });
  fireEvent.change(view.getByPlaceholderText('your_email@gmail.com'), { target: { value: 'newuser@example.com' } });
  const password = view.container.querySelector('input[type="password"]');
  if (!password) throw new Error('Password input is missing');
  fireEvent.change(password, { target: { value: 'test-password-only' } });
  fireEvent.click(view.getByRole('button', { name: /Tạo tài khoản mới/ }));
  await waitFor(() => expect(mocks.register).toHaveBeenCalledWith({
    full_name: 'New User', username: 'newuser', email: 'newuser@example.com',
    password: 'test-password-only', avatar_url: '', bio: '',
  }));
  expect(mocks.upload).not.toHaveBeenCalled();
  await view.findByText('Login destination');
});
