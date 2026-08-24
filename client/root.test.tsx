// @vitest-environment jsdom

import { screen } from '@testing-library/dom';
import { cleanup, render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import App from './root';

afterEach(cleanup);

describe('App', () => {
  it('現在のルートに対応するページを表示する', () => {
    const router = createMemoryRouter([
      {
        path: '/',
        element: (<App />),
        children: [
          {
            index: true,
            element: (<p>テストページ</p>)
          }
        ]
      }
    ]);
    
    render(<RouterProvider router={router} />);
    
    expect(screen.getByText('テストページ')).toBeInTheDocument();
  });
});
