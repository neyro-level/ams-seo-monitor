export interface ActionResult<TResult> {
  ok: true;
  data: TResult;
}

export interface ActionFailure {
  ok: false;
  code: string;
  message: string;
  correlationId: string;
  fieldErrors: Record<string, string[]>;
}

export type DefinedAction<TResult> = ActionResult<TResult> | ActionFailure;

export function defineAction<TInput, TResult>(
  execute: (input: TInput) => Promise<DefinedAction<TResult>>,
) {
  return execute;
}
