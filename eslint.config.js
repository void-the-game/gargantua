import globals from 'globals'
import pluginJs from '@eslint/js'

export default [
  { ignores: ['dist/**'] },
  { languageOptions: { globals: { ...globals.node, ...globals.jest } } },
  pluginJs.configs.recommended,
]
