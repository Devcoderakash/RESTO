export function getParam(param: string | string[] | undefined, defaultVal = ''): string {
  if (Array.isArray(param)) return param[0] || defaultVal;
  return param || defaultVal;
}

