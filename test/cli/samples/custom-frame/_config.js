const { assertIncludes } = require('../../../utils.js');

module.exports = {
	description: 'errors with plugin generated code frames also contain stack',
	command: 'rollup -c',
	error: () => true,
	stderr: stderr => {
		assertIncludes(
			stderr,
			'[!] (plugin at position 1) Error: My error.\n' +
				'main.js\ncustom code frame\nError: My error.\n' +
				'    at Object.'
		);
		assertIncludes(stderr, 'rollup.config.js:9:19');
	}
};
