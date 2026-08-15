import { describe, it, expect } from 'vitest'
import { isCheckoutOverdue } from '@/services/firebase/toolCheckouts'
import type { ToolCheckout } from '@/types'

function makeCheckout(overrides: Partial<ToolCheckout> = {}): ToolCheckout {
  return {
    id: 'c1',
    projectId: 'p1',
    projectTitle: 'TL-001',
    userId: 'u1',
    userEmail: 'a@x.com',
    userName: 'A',
    action: 'checking_out',
    toolCategory: 'Hand Tools',
    toolName: 'Hammer',
    quantity: 1,
    locationOfUse: 'in_lab',
    expectedReturnDate: '2099-01-01',
    conditionAtCheckout: 'good',
    isOverdue: false,
    createdAt: {} as never,
    updatedAt: {} as never,
    ...overrides,
  }
}

const REAL_TODAY = new Date()
const REAL_TODAY_STR = `${REAL_TODAY.getFullYear()}-${String(REAL_TODAY.getMonth() + 1).padStart(2, '0')}-${String(REAL_TODAY.getDate()).padStart(2, '0')}`

const yesterday = new Date(REAL_TODAY)
yesterday.setDate(yesterday.getDate() - 1)
const YESTERDAY_STR = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

describe('isCheckoutOverdue', () => {
  it('is false when the expected return date is today', () => {
    expect(isCheckoutOverdue(makeCheckout({ expectedReturnDate: REAL_TODAY_STR }))).toBe(false)
  })

  it('is false when the expected return date is in the future', () => {
    expect(isCheckoutOverdue(makeCheckout({ expectedReturnDate: '2999-12-31' }))).toBe(false)
  })

  it('is true when the expected return date is in the past and not returned', () => {
    expect(isCheckoutOverdue(makeCheckout({ expectedReturnDate: YESTERDAY_STR }))).toBe(true)
  })

  it('is false when the tool has been returned, even if past due', () => {
    expect(
      isCheckoutOverdue(
        makeCheckout({ expectedReturnDate: YESTERDAY_STR, returnedAt: new Date() as never }),
      ),
    ).toBe(false)
  })

  it('is false for an invalid/empty date', () => {
    expect(isCheckoutOverdue(makeCheckout({ expectedReturnDate: '' }))).toBe(false)
  })
})
