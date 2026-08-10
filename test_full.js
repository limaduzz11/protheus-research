import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Mock process before running
const originalProcess = process;

// Test searchProtheusDocs directly
const searchDocs = require('./dist/tools/searchDocs.js').searchProtheusDocs;
const searchCommunity = require('./dist/tools/searchCommunity.js').searchCommunity;

async function runTests() {
    console.log('=== Testing protheus-research full functionality ===\n');
    
    try {
        console.log('1. Testing searchProtheusDocs...');
        const docsResult = await searchDocs('TCSQLExec', 'FAT');
        console.log(`   Total found: ${docsResult.totalFound}\n`);
        if (docsResult.results.length > 0) {
            console.log('   First 3 results:');
            docsResult.results.slice(0, 3).forEach((r, i) => {
                console.log(`   ${i+1}. ${r.title}`);
                console.log(`      URL: ${r.url}`);
                console.log(`      Fonte: ${r.sourceType} (Nível ${r.sourceLevel}, relevância ${r.relevance}%)`);
            });
        } else {
            console.log('   ⚠️  Nenhum resultado encontrado (API pode estar restrita)');
        }
        
        console.log('\n2. Testing searchCommunity...');
        const communityResult = await searchCommunity('TCSQLExec', true);
        console.log(`   Total encontrado: ${communityResult.totalFound}\n`);
        if (communityResult.results.length > 0) {
            console.log('   First 3 results:');
            communityResult.results.slice(0, 3).forEach((r, i) => {
                console.log(`   ${i+1}. ${r.title}`);
                console.log(`      URL: ${r.url}`);
                console.log(`      Fonte: ${r.sourceType} (Nível ${r.sourceLevel}, relevância ${r.relevance}%)`);
                console.log(`      Resumo: ${r.snippet.substring(0, 120)}...\n`);
            });
        } else {
            console.log('   ⚠️  Nenhum resultado comunitário encontrado');
        }
        
        console.log('\n3. Testing generateAdvplExample...');
        const generateExample = require('./dist/tools/generateExample.js').generateExample;
        const exampleResult = await generateExample('advpl', 'query customer list', 'ZA1');
        console.log(`   Language: ${exampleResult.language}`);
        console.log(`   Code length: ${exampleResult.code.length} chars`);
        console.log(`   Description: ${exampleResult.description}`);
        console.log(`   First 200 chars of code:`);
        console.log('   ' + exampleResult.code.substring(0, 200).replace(/\n/g, '\n   '));
        
        console.log('\n=== All tests completed ===');
        
        return {
            docs: docsResult,
            community: communityResult,
            example: exampleResult
        };
        
    } catch (error) {
        console.error('\n❌ Test failed:', error);
        console.error('\nStack trace:', error.stack);
        return null;
    }
}

runTests();
