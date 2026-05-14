import { describe, expect, it } from 'vitest'
import { DESTINATION_PACKS, validateDestinationPacks, type DestinationPack } from './destinationPacks'

describe('destination pack validation', () => {
  it('keeps curated destination packs structurally valid', () => {
    expect(validateDestinationPacks(DESTINATION_PACKS)).toEqual([])
  })

  it('flags pack issues that would make recommendations weak or hard to source', () => {
    const badPack: DestinationPack = {
      id: 'bad-pack',
      name: '',
      location: '',
      address: '',
      matchers: [''],
      sourceUrls: ['not-a-url'],
      restaurants: [
        {
          id: 'dup',
          name: 'Dinner',
          category: 'Dining',
          notes: '',
          url: 'ftp://example.com/menu',
        },
      ],
      activities: [
        {
          id: 'dup',
          name: '',
          category: '',
          notes: 'Activity note',
        },
      ],
      contacts: [],
      planningNotes: [],
    }

    const paths = validateDestinationPacks([badPack]).map((error) => error.path)

    expect(paths).toEqual(expect.arrayContaining([
      'name',
      'location',
      'address',
      'matchers',
      'sourceUrls.0',
      'restaurants.dup',
      'activities.dup',
    ]))
  })
})
