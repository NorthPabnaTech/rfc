'use client';

// hooks/use-modal.ts
import { useReducer } from 'react';

/** Default modal types — a consumer can pass its own union to widen these. */
export type ModalType = 'create' | 'update' | 'delete';

interface ModalState<TType extends string, TData> {
  open: boolean;
  type: TType | null;
  data: TData | null;
}

type ModalAction<TType extends string, TData> =
  { kind: 'OPEN'; type: TType; data?: TData } | { kind: 'CLOSE' };

const INITIAL = { open: false, type: null, data: null };

function reducer<TType extends string, TData>(
  state: ModalState<TType, TData>,
  action: ModalAction<TType, TData>,
): ModalState<TType, TData> {
  switch (action.kind) {
    case 'OPEN':
      return { open: true, type: action.type, data: action.data ?? null };
    case 'CLOSE':
      return INITIAL as ModalState<TType, TData>;
    default:
      return state;
  }
}

/**
 * Tiny state machine for a dialog that can be in one of a few modes.
 *
 * @template TData - the record flowing through the modal (e.g. the row to edit)
 * @template TType - allowed modal types (default: {@link ModalType})
 *
 * `dispatch` is stable, so the returned helpers are plain functions — no
 * `useCallback` needed.
 */
export function useModal<TData = unknown, TType extends string = ModalType>() {
  const [state, dispatch] = useReducer(reducer<TType, TData>, INITIAL as ModalState<TType, TData>);

  const openModal = (type: TType, data?: TData) => dispatch({ kind: 'OPEN', type, data });
  const closeModal = () => dispatch({ kind: 'CLOSE' });

  /**
   * `isOpen()`           → is any modal open?
   * `isOpen(['create'])` → open AND the current type is in the list?
   */
  const isOpen = (types?: TType[]) => {
    if (!state.open) return false;
    if (!types?.length) return true;
    return state.type !== null && types.includes(state.type);
  };

  return { ...state, openModal, closeModal, isOpen };
}
