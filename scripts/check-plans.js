const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const plans = await prisma.plan.findMany({
        select: {
            id: true,
            name: true,
            priceMonthlyCents: true,
            priceYearlyCents: true,
            active: true,
        }
    });

    console.log('\n=== Plans in Database ===\n');
    if (plans.length === 0) {
        console.log('No plans found in database');
    } else {
        plans.forEach(plan => {
            console.log(`ID: ${plan.id}`);
            console.log(`Name: ${plan.name}`);
            console.log(`Monthly: R$ ${plan.priceMonthlyCents ? (plan.priceMonthlyCents / 100).toFixed(2) : 'N/A'}`);
            console.log(`Yearly: R$ ${plan.priceYearlyCents ? (plan.priceYearlyCents / 100).toFixed(2) : 'N/A'}`);
            console.log(`Active: ${plan.active}`);
            console.log('---');
        });
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
