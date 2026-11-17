const U={uid:'u1',email:'emiranda@santamonicafishing.com',emailVerified:true,displayName:'Elvis Miranda'};
export function getAuth(){return {currentUser:U}}
export async function setPersistence(){}
export const browserLocalPersistence={};
export function onAuthStateChanged(a,cb){setTimeout(()=>cb(U),1);return ()=>{}}
export async function signOut(){}
