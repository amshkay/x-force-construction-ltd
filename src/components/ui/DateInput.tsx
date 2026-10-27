import React from 'react';
import { DatePicker, DatePickerProps } from './DatePicker';

export type DateInputProps = DatePickerProps;

export const DateInput: React.FC<DateInputProps> = (props) => {
  return <DatePicker {...props} />;
};

DateInput.displayName = 'DateInput';
