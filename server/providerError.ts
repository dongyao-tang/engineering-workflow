export class ProviderError extends Error {
 constructor(public code:string,public httpStatus=502){super(code);}
}
