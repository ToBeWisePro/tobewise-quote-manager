const { generateSubjects } = require('./src/app/lib/generateSubjects.ts');
const { generateAuthor } = require('./src/app/lib/generateAuthor.ts');

async function testGeneration() {
  console.log('Testing generation functionality...');
  
  try {
    // Test subject generation
    console.log('Testing subject generation...');
    const subjects = await generateSubjects(
      "The only limit to our realization of tomorrow is our doubts of today.",
      ["inspiration", "motivation", "doubt", "wisdom", "life", "planning", "courage", "success", "failure", "hope"]
    );
    console.log('Generated subjects:', subjects);
    
    // Test author generation
    console.log('Testing author generation...');
    const author = await generateAuthor("The only limit to our realization of tomorrow is our doubts of today.");
    console.log('Generated author:', author);
    
    console.log('✅ Generation tests completed successfully!');
  } catch (error) {
    console.error('❌ Generation test failed:', error);
  }
}

testGeneration(); 