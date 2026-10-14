/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateProjectFile } from './projectValidation'

const samplePath = join(process.cwd(), 'public', 'sample.anal')
const loadSample = () => JSON.parse(readFileSync(samplePath, 'utf8')) as Record<string, unknown>

const validTrack = {
  id: 't1',
  name: 'Track',
  points: [0, 0, 10, 10],
  anchors: [{ source: { x: 0, y: 0 }, target: { x: 1, y: 1 } }],
  color: '#ff0000',
  opacity: 1,
}
const validPath = { id: 'p1', points: [0, 0, 5, 5], width: 4, color: '#000', opacity: 0.5 }
const validAnnotation = {
  id: 'a1',
  position: { x: 3, y: 4 },
  comment: 'Control',
  size: 10,
  color: '#00f',
}

function project(overrides: Record<string, unknown> = {}) {
  return {
    format: 'map-analysis',
    version: 1,
    mapImage: null,
    tracks: [],
    paths: [],
    annotations: [],
    ...overrides,
  }
}

describe('validateProjectFile', () => {
  it('accepts the bundled sample project', () => {
    expect(() => validateProjectFile(loadSample())).not.toThrow()
  })

  it('accepts a minimal empty project', () => {
    expect(() => validateProjectFile(project())).not.toThrow()
  })

  it('rejects files that are not objects', () => {
    expect(() => validateProjectFile('nope')).toThrow('not valid JSON')
    expect(() => validateProjectFile(null)).toThrow('not valid JSON')
  })

  it('rejects other formats and versions', () => {
    expect(() => validateProjectFile(project({ format: 'other' }))).toThrow(
      'Not an O-Analysis project file',
    )
    expect(() => validateProjectFile(project({ version: 2 }))).toThrow(
      'Unsupported project version: 2',
    )
  })

  it('names the first damaged track', () => {
    const bad = { ...validTrack, points: [0, 0, 10] }
    expect(() =>
      validateProjectFile(project({ tracks: [validTrack, bad] })),
    ).toThrow('GPX tracks in project file (entry 2 is damaged)')
  })

  it('rejects non-finite coordinates in drawings', () => {
    const bad = { ...validPath, points: [0, Number.NaN] }
    expect(() => validateProjectFile(project({ paths: [bad] }))).toThrow(
      'drawings in project file (entry 1 is damaged)',
    )
  })

  it('rejects annotations without a valid position', () => {
    const bad = { ...validAnnotation, position: { x: 1 } }
    expect(() => validateProjectFile(project({ annotations: [bad] }))).toThrow(
      'annotations in project file (entry 1 is damaged)',
    )
  })

  it('rejects a map image with zero dimensions', () => {
    const mapImage = { src: 'data:image/png;base64,AA', width: 0, height: 10, name: 'm.png' }
    expect(() => validateProjectFile(project({ mapImage }))).toThrow(
      'Invalid map image',
    )
  })

  it('accepts valid tracks, paths and annotations together', () => {
    expect(() =>
      validateProjectFile(
        project({
          tracks: [validTrack],
          paths: [validPath],
          annotations: [validAnnotation],
        }),
      ),
    ).not.toThrow()
  })
})
