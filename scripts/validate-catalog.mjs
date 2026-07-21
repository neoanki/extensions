#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const MAX_PACKAGE_BYTES = 12 * 1024 * 1024
const permissions = new Set(['study:read', 'study:signals', 'study:prompt-types', 'study:queue-policies', 'content:read', 'content:patch-own', 'content:migrate', 'media:create', 'network:fetch', 'secrets:device', 'config:sync', 'files:save', 'ui:open-external', 'ui:settings', 'ui:review', 'ui:page', 'ui:create', 'ui:workspace', 'ui:migration'])
const categories = new Set(['study', 'authoring', 'import-export', 'planning', 'analytics', 'accessibility', 'integration', 'appearance'])
const idPattern = /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
const packagePattern = /^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\/[^/]+\/[^/]+\.neoanki-extension$/
const compareVersions = (left, right) => {
  const parse = version => { const [withPre] = version.split('+'); const [core, pre = ''] = withPre.split('-', 2); return { core: core.split('.').map(Number), pre: pre ? pre.split('.') : [] } }
  const a = parse(left); const b = parse(right)
  for (let index = 0; index < 3; index += 1) if (a.core[index] !== b.core[index]) return a.core[index] - b.core[index]
  if (!a.pre.length || !b.pre.length) return a.pre.length ? -1 : b.pre.length ? 1 : 0
  for (let index = 0; index < Math.max(a.pre.length, b.pre.length); index += 1) {
    if (a.pre[index] === undefined || b.pre[index] === undefined) return a.pre[index] === undefined ? -1 : 1
    if (a.pre[index] === b.pre[index]) continue
    const an = /^\d+$/.test(a.pre[index]) ? Number(a.pre[index]) : null; const bn = /^\d+$/.test(b.pre[index]) ? Number(b.pre[index]) : null
    if (an !== null || bn !== null) return an === null ? 1 : bn === null ? -1 : an - bn
    return a.pre[index].localeCompare(b.pre[index])
  }
  return 0
}
const fail = message => { throw new Error(message) }
const text = (value, name, max) => typeof value === 'string' && value.trim() && value.length <= max ? value : fail(`${name} must be non-empty text of at most ${max} characters.`)
const uniqueStrings = (value, name, max) => Array.isArray(value) && value.length <= max && value.every(item => typeof item === 'string') && new Set(value).size === value.length ? value : fail(`${name} must be a unique string array with at most ${max} values.`)
const httpsUrl = (value, name) => { const url = new URL(text(value, name, 500)); if (url.protocol !== 'https:') fail(`${name} must use HTTPS.`); return url }

const validateEntry = entry => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail('Each extension must be an object.')
  const allowed = ['id', 'name', 'summary', 'description', 'publisher', 'repository', 'homepage', 'license', 'categories', 'tags', 'release']
  for (const key of Object.keys(entry)) if (!allowed.includes(key)) fail(`${entry.id || 'Extension'} has unknown field ${key}.`)
  const id = text(entry.id, 'id', 120)
  if (!idPattern.test(id)) fail(`${id}: id must use lowercase reverse-domain notation.`)
  text(entry.name, `${id}.name`, 80); text(entry.summary, `${id}.summary`, 160); text(entry.description, `${id}.description`, 1000); text(entry.license, `${id}.license`, 64)
  if (!entry.publisher || typeof entry.publisher !== 'object') fail(`${id}.publisher is required.`)
  if (JSON.stringify(Object.keys(entry.publisher).sort()) !== JSON.stringify(['name', 'url'])) fail(`${id}.publisher contains missing or unknown fields.`)
  text(entry.publisher.name, `${id}.publisher.name`, 100); httpsUrl(entry.publisher.url, `${id}.publisher.url`)
  const repository = httpsUrl(entry.repository, `${id}.repository`)
  if (repository.hostname !== 'github.com' || repository.pathname.split('/').filter(Boolean).length !== 2) fail(`${id}.repository must be a GitHub repository URL.`)
  if (entry.homepage) httpsUrl(entry.homepage, `${id}.homepage`)
  const entryCategories = uniqueStrings(entry.categories, `${id}.categories`, 4)
  if (!entryCategories.length || entryCategories.some(value => !categories.has(value))) fail(`${id}.categories contains an unsupported category.`)
  const tags = uniqueStrings(entry.tags, `${id}.tags`, 12)
  if (tags.some(value => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 32)) fail(`${id}.tags must be lowercase slugs.`)
  const release = entry.release
  if (!release || typeof release !== 'object' || Array.isArray(release)) fail(`${id}.release is required.`)
  const releaseAllowed = ['version', 'publishedAt', 'packageUrl', 'sha256', 'publisherKey', 'minimumNeoAnkiVersion', 'permissions']
  for (const key of Object.keys(release)) if (!releaseAllowed.includes(key)) fail(`${id}.release has unknown field ${key}.`)
  if (!semverPattern.test(release.version) || !semverPattern.test(release.minimumNeoAnkiVersion)) fail(`${id}: release versions must use semantic versioning.`)
  if (!Number.isFinite(Date.parse(release.publishedAt))) fail(`${id}.release.publishedAt must be an ISO date-time.`)
  if (!packagePattern.test(release.packageUrl)) fail(`${id}.release.packageUrl must be an immutable GitHub Release .neoanki-extension asset.`)
  const packageRepository = new URL(release.packageUrl).pathname.split('/').filter(Boolean).slice(0, 2).join('/').toLowerCase()
  const declaredRepository = repository.pathname.split('/').filter(Boolean).join('/').toLowerCase()
  if (packageRepository !== declaredRepository) fail(`${id}: package release must belong to the declared source repository.`)
  if (!/^[a-f0-9]{64}$/.test(release.sha256)) fail(`${id}.release.sha256 must be a lowercase SHA-256 digest.`)
  text(release.publisherKey, `${id}.release.publisherKey`, 4096)
  const requested = uniqueStrings(release.permissions, `${id}.release.permissions`, 19)
  if (requested.some(value => !permissions.has(value))) fail(`${id}.release.permissions contains an unsupported permission.`)
  return entry
}

const download = async entry => {
  const response = await fetch(entry.release.packageUrl, { redirect: 'follow', signal: AbortSignal.timeout(60_000), headers: { 'user-agent': 'neoanki-marketplace-validator' } })
  if (!response.ok) fail(`${entry.id}: package download returned ${response.status}.`)
  const length = Number(response.headers.get('content-length') || 0)
  if (length > MAX_PACKAGE_BYTES) fail(`${entry.id}: package is larger than 12 MB.`)
  const chunks = []; let total = 0
  for await (const chunk of response.body) { total += chunk.byteLength; if (total > MAX_PACKAGE_BYTES) fail(`${entry.id}: package is larger than 12 MB.`); chunks.push(chunk) }
  return Buffer.concat(chunks)
}

const inspectPackage = async (entry, bytes, directory) => {
  const digest = createHash('sha256').update(bytes).digest('hex')
  if (digest !== entry.release.sha256) fail(`${entry.id}: package SHA-256 does not match catalog metadata.`)
  const archive = join(directory, `${entry.id}.neoanki-extension`); await writeFile(archive, bytes)
  const result = spawnSync('unzip', ['-p', archive, 'manifest.json'], { encoding: 'utf8', maxBuffer: 128 * 1024 })
  if (result.status !== 0 || !result.stdout) fail(`${entry.id}: package has no readable root manifest.json.`)
  let manifest; try { manifest = JSON.parse(result.stdout) } catch { fail(`${entry.id}: package manifest is not valid JSON.`) }
  const expected = { id: entry.id, name: entry.name, version: entry.release.version, publisher: entry.publisher.name, publisherKey: entry.release.publisherKey }
  for (const [key, value] of Object.entries(expected)) if (manifest[key] !== value) fail(`${entry.id}: package manifest ${key} does not match catalog metadata.`)
  if (JSON.stringify(manifest.permissions) !== JSON.stringify(entry.release.permissions)) fail(`${entry.id}: package permissions do not match catalog metadata.`)
  if (manifest.format !== 'neo-anki-extension' || manifest.schemaVersion !== 2 || manifest.sdkVersion !== 2) fail(`${entry.id}: package must use NeoAnki extension SDK 2.`)
}

const raw = JSON.parse(await readFile('catalog.json', 'utf8'))
if (JSON.stringify(Object.keys(raw).sort()) !== JSON.stringify(['$schema', 'extensions', 'format', 'schemaVersion'])) fail('catalog.json contains missing or unknown root fields.')
if (raw.$schema !== './schema/catalog.schema.json' || raw.format !== 'neo-anki-extension-catalog' || raw.schemaVersion !== 1 || !Array.isArray(raw.extensions) || raw.extensions.length > 5000) fail('catalog.json header or extensions array is invalid.')
const entries = raw.extensions.map(validateEntry)
if (new Set(entries.map(entry => entry.id)).size !== entries.length) fail('Extension ids must be unique.')
if (JSON.stringify(entries.map(entry => entry.id)) !== JSON.stringify(entries.map(entry => entry.id).sort())) fail('Extensions must be sorted by id.')

const baseArg = process.argv.indexOf('--base')
if (baseArg >= 0 && process.argv[baseArg + 1]) {
  const result = spawnSync('git', ['show', `${process.argv[baseArg + 1]}:catalog.json`], { encoding: 'utf8' })
  if (result.status === 0) {
    const previous = new Map(JSON.parse(result.stdout).extensions.map(entry => [entry.id, entry]))
    for (const entry of entries) {
      const old = previous.get(entry.id); if (!old) continue
      if (old.repository !== entry.repository) fail(`${entry.id}: repository identity cannot change in an ordinary catalog update.`)
      if (old.release.publisherKey !== entry.release.publisherKey) fail(`${entry.id}: publisher key continuity check failed. Open a security issue for a reviewed key rotation.`)
      if (compareVersions(entry.release.version, old.release.version) < 0) fail(`${entry.id}: marketplace releases cannot move backward from ${old.release.version} to ${entry.release.version}.`)
    }
  }
}

const directory = await mkdtemp(join(tmpdir(), 'neoanki-catalog-'))
try { for (const entry of entries) await inspectPackage(entry, await download(entry), directory) }
finally { await rm(directory, { recursive: true, force: true }) }
console.log(`Validated ${entries.length} marketplace extension${entries.length === 1 ? '' : 's'}.`)
