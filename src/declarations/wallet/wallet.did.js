export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'getBalance' : IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    'getNFTCount' : IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    'updateBalance' : IDL.Func([IDL.Principal, IDL.Nat], [], []),
    'updateNFTCount' : IDL.Func([IDL.Principal], [IDL.Nat], []),
  });
};
export const init = ({ IDL }) => { return []; };
