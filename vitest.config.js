const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
	test: {
		watch: false,
		includeSource: ['lib/**/*.{js,ts}', 'bin/**/*.{js,ts}'],
		globals: true,
	},
});
