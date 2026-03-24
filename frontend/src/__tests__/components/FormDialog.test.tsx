import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormDialog, FormField } from '../../components/ui/form-dialog';

describe('FormDialog', () => {
  const mockFields: FormField[] = [
    { id: 'name', label: 'Name', type: 'text', required: true },
    { id: 'email', label: 'Email', type: 'email', required: true },
    { id: 'type', label: 'Type', type: 'select', options: [
      { value: 'a', label: 'Type A' },
      { value: 'b', label: 'Type B' },
    ]},
  ];

  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog when open', () => {
    render(
      <FormDialog
        open={true}
        onOpenChange={() => {}}
        title="Test Dialog"
        fields={mockFields}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
  });

  it('should render all form fields', () => {
    render(
      <FormDialog
        open={true}
        onOpenChange={() => {}}
        title="Test Dialog"
        fields={mockFields}
        onSubmit={mockOnSubmit}
      />
    );

    // Use role-based queries instead of labelText for better compatibility
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should show required indicator for required fields', () => {
    render(
      <FormDialog
        open={true}
        onOpenChange={() => {}}
        title="Test Dialog"
        fields={mockFields}
        onSubmit={mockOnSubmit}
      />
    );

    // Check for required asterisk
    const requiredSpans = screen.getAllByText('*');
    expect(requiredSpans.length).toBeGreaterThan(0);
  });

  it('should render submit and cancel buttons', () => {
    render(
      <FormDialog
        open={true}
        onOpenChange={() => {}}
        title="Test Dialog"
        fields={mockFields}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();
  });

  it('should use custom submit text when provided', () => {
    render(
      <FormDialog
        open={true}
        onOpenChange={() => {}}
        title="Test Dialog"
        fields={mockFields}
        onSubmit={mockOnSubmit}
        submitText="Create"
      />
    );

    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('should display error message when submission fails', async () => {
    const errorOnSubmit = vi.fn().mockRejectedValue(new Error('Submit failed'));

    render(
      <FormDialog
        open={true}
        onOpenChange={() => {}}
        title="Test Dialog"
        fields={mockFields}
        onSubmit={errorOnSubmit}
      />
    );

    // Fill in required fields first
    const textboxes = screen.getAllByRole('textbox');
    await userEvent.type(textboxes[0], 'Test');
    await userEvent.type(textboxes[1], 'test@example.com');

    // Click submit
    await userEvent.click(screen.getByRole('button', { name: '保存' }));

    // Check that error is displayed
    await waitFor(() => {
      expect(screen.getByText('Submit failed')).toBeInTheDocument();
    });
  });
});
