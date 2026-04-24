const { clerkClient } = require('@clerk/nextjs/server');
console.log(clerkClient);
const c = clerkClient();
console.log(c);
console.log(c instanceof Promise);
