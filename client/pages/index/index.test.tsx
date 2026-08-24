// @vitest-environment jsdom

import { screen } from '@testing-library/dom';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import Index from './index';

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(cleanup);

describe('Index', () => {
  it('パスワードを入力するとログインボタンを有効化する', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );
    
    const passwordInput = screen.getByPlaceholderText('Password');
    const loginButton = screen.getByRole('button', { name: 'Login' });
    expect(loginButton).toBeDisabled();
    
    await user.type(passwordInput, 'password');
    
    expect(passwordInput).toHaveValue('password');
    expect(loginButton).toBeEnabled();
  });
});
