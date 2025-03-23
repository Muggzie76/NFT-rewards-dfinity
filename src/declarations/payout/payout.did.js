export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'processPayouts' : IDL.Func([], [], []),
    'register' : IDL.Func([], [], []),
  });
};
export const init = ({ IDL }) => { return []; };
