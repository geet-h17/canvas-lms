/*
 * Copyright (C) 2023 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import React, {useCallback, useEffect, useState} from 'react'
import {View} from '@instructure/ui-view'
import {IconButton} from '@instructure/ui-buttons'
import {IconTrashLine} from '@instructure/ui-icons'
import {useScope as useI18nScope} from '@canvas/i18n'
import DateValidator from '@canvas/datetime/DateValidator'
import ClearableDateTimeInput from './ClearableDateTimeInput'
// import AssigneeSelector from '../AssigneeSelector'

const I18n = useI18nScope('differentiated_modules')

// TODO: until we resolve how to handle queries (which wreak havoc on specs)
function AssigneeSelector({cardId}: {cardId: string}) {
  return (
    <View as="div" borderWidth="small" padding="small" margin="medium 0 0 0">
      Assign To goes here (cardId: {cardId})
    </View>
  )
}

function arrayEquals(a: any[], b: any[]) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

export interface DateValidatorInputArgs {
  lock_at: string | null
  unlock_at: string | null
  due_at: string | null
  set_type?: string
  course_section_id?: string
  student_ids?: string[]
}

export type ItemAssignToCardProps = {
  cardId: string
  due_at: string | null
  unlock_at: string | null
  lock_at: string | null
  onDelete?: (cardId: string) => void
  onValidityChange?: (cardId: string, isValid: boolean) => void
}

export default function ItemAssignToCard({
  cardId,
  due_at,
  unlock_at,
  lock_at,
  onDelete,
  onValidityChange,
}: ItemAssignToCardProps) {
  const [dateValidator] = useState<DateValidator>(
    new DateValidator({
      date_range: {...ENV.VALID_DATE_RANGE},
      hasGradingPeriods: ENV.HAS_GRADING_PERIODS,
      gradingPeriods: ENV.active_grading_periods,
      userIsAdmin: (ENV.current_user_roles || []).includes('admin'),
      postToSIS: ENV.POST_TO_SIS && ENV.DUE_DATE_REQUIRED_FOR_ACCOUNT,
    })
  )
  const [dueDate, setDueDate] = useState<string | null>(due_at)
  const [availableFromDate, setAvailableFromDate] = useState<string | null>(unlock_at)
  const [availableToDate, setAvailableToDate] = useState<string | null>(lock_at)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const handleDelete = useCallback(() => {
    onDelete?.(cardId)
  }, [cardId, onDelete])

  const handleDueDateChange = useCallback(
    (_event: React.SyntheticEvent, value: string | undefined) => {
      setDueDate(value || null)
    },
    []
  )

  const handleAvailableFromDateChange = useCallback(
    (_event: React.SyntheticEvent, value: string | undefined) => {
      setAvailableFromDate(value || null)
    },
    []
  )

  const handleAvailableToDateChange = useCallback(
    (_event: React.SyntheticEvent, value: string | undefined) => {
      setAvailableToDate(value || null)
    },
    []
  )

  useEffect(() => {
    const data: DateValidatorInputArgs = {
      due_at: dueDate,
      unlock_at: availableFromDate,
      lock_at: availableToDate,
      student_ids: [],
      course_section_id: '2',
    }
    const newErrors = dateValidator.validateDatetimes(data)
    const newBadDates = Object.keys(newErrors)
    const oldBadDates = Object.keys(validationErrors)
    if (!arrayEquals(newBadDates, oldBadDates)) {
      onValidityChange?.(cardId, newBadDates.length === 0)
      setValidationErrors(newErrors)
    }
  }, [
    availableFromDate,
    availableToDate,
    cardId,
    dateValidator,
    dueDate,
    onValidityChange,
    validationErrors,
  ])

  const dateTimeInputs = [
    {
      key: 'due_at',
      description: I18n.t('Choose a due date and time'),
      dateRenderLabel: I18n.t('Due Date'),
      value: dueDate,
      onChange: handleDueDateChange,
      onClear: () => setDueDate(null),
    },
    {
      key: 'unlock_at',
      description: I18n.t('Choose an available from date and time'),
      dateRenderLabel: I18n.t('Available from'),
      value: availableFromDate,
      onChange: handleAvailableFromDateChange,
      onClear: () => setAvailableFromDate(null),
    },
    {
      key: 'lock_at',
      description: I18n.t('Choose an available to date and time'),
      dateRenderLabel: I18n.t('Until'),
      value: availableToDate,
      onChange: handleAvailableToDateChange,
      onClear: () => setAvailableToDate(null),
    },
  ]

  return (
    <View
      data-testid="item-assign-to-card"
      as="div"
      position="relative"
      padding="medium small small small"
      borderWidth="small"
      borderColor="primary"
      borderRadius="medium"
    >
      {typeof onDelete === 'function' && (
        <div
          style={{
            position: 'absolute',
            insetInlineEnd: '.75rem',
            insetBlockStart: '.75rem',
            zIndex: 2,
          }}
        >
          <IconButton
            color="danger"
            screenReaderLabel={I18n.t('Delete')}
            size="small"
            withBackground={false}
            withBorder={false}
            onClick={handleDelete}
          >
            <IconTrashLine />
          </IconButton>
        </div>
      )}
      <AssigneeSelector cardId={cardId} />
      {dateTimeInputs.map(props => (
        <ClearableDateTimeInput
          {...props}
          messages={
            validationErrors[props.key] ? [{type: 'error', text: validationErrors[props.key]}] : []
          }
        />
      ))}
    </View>
  )
}
