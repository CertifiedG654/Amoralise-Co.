const fs = require('fs');
const path = require('path');
const assert = require('assert');

const projectRoot = __dirname;

const oldCategories = [
  'Fresh Produce',
  'Dairy',
  'Snacks',
  'Beverages',
  'Frozen Foods',
  'Canned Goods',
  'Household Items',
  'Personal Care'
];

const newCategories = [
  'Beer',
  'Whiskey',
  'Vodka',
  'Gin',
  'Rum',
  'Brandy',
  'Tequila',
  'Wine'
];

function testAdminHTML() {
  const adminHtmlPath = path.join(projectRoot, 'frontend', 'pages', 'Admin.html');
  const adminHtmlContent = fs.readFileSync(adminHtmlPath, 'utf-8');

  oldCategories.forEach(oldCategory => {
    assert.ok(!adminHtmlContent.includes(`<option>${oldCategory}</option>`), `Admin.html should not contain ${oldCategory}`);
  });

  newCategories.forEach(newCategory => {
    assert.ok(adminHtmlContent.includes(`<option>${newCategory}</option>`), `Admin.html should contain ${newCategory}`);
  });

  console.log('Admin.html tests passed!');
}

function testIndexHTML() {
  const indexHtmlPath = path.join(projectRoot, 'frontend', 'pages', 'Index.html');
  const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');

  oldCategories.forEach(oldCategory => {
    assert.ok(!indexHtmlContent.includes(`<div class="name">${oldCategory}</div>`), `Index.html should not contain ${oldCategory}`);
  });

  newCategories.forEach(newCategory => {
    assert.ok(indexHtmlContent.includes(`<div class="name">${newCategory}</div>`), `Index.html should contain ${newCategory}`);
  });

  console.log('Index.html tests passed!');
}

function testIndexJS() {
  const indexJsPath = path.join(projectRoot, 'frontend', 'js', 'Index.js');
  const indexJsContent = fs.readFileSync(indexJsPath, 'utf-8');

  const expectedCategoryMap = `const categoryMap = {
      'beer': ['Beer'],
      'whiskey': ['Whiskey'],
      'vodka': ['Vodka'],
      'gin': ['Gin'],
      'rum': ['Rum'],
      'brandy': ['Brandy'],
      'tequila': ['Tequila'],
      'wine': ['Wine']
    };`;

  assert.ok(indexJsContent.includes(expectedCategoryMap), 'Index.js should have the updated categoryMap');

  console.log('Index.js tests passed!');
}

try {
  testAdminHTML();
  testIndexHTML();
  testIndexJS();
  console.log('All tests passed!');
} catch (error) {
  console.error('Tests failed:');
  console.error(error);
  process.exit(1);
}
