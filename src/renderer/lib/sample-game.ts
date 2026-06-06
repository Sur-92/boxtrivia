import type { SeedGame } from '@shared/types'

// Bundled demo board so the app is playable on first launch with one click.
// Mirrors the JSON seed format documented in README / games/*.json.
export const SAMPLE_GAME: SeedGame = {
  title: 'Early 2000s Pop Animals',
  categories: [
    {
      name: 'Movie Critters',
      clues: [
        { value: 200, clue: 'This 2003 Pixar film follows a clownfish dad searching the ocean for his son.', response: 'What is Finding Nemo?' },
        { value: 400, clue: 'In "Ice Age" (2002), this acorn-obsessed saber-toothed squirrel steals every scene.', response: 'Who is Scrat?' },
        { value: 600, clue: 'Will Smith voiced Oscar, a fast-talking fish, in this 2004 DreamWorks film.', response: 'What is Shark Tale?' },
        { value: 800, clue: 'This 2005 DreamWorks film sends four Central Park Zoo animals to an African island.', response: 'What is Madagascar?' },
        { value: 1000, clue: 'In Disney’s 2002 "Lilo & Stitch," Stitch is officially designated this experiment number.', response: 'What is 626?' }
      ]
    },
    {
      name: 'Cartoon Menagerie',
      clues: [
        { value: 200, clue: 'This square yellow sea sponge lives in a pineapple under the sea.', response: 'Who is SpongeBob SquarePants?' },
        { value: 400, clue: 'SpongeBob’s dim-witted best friend is this pink starfish.', response: 'Who is Patrick Star?' },
        { value: 600, clue: 'On "The Wild Thornberrys," young Eliza has the secret power to do this with animals.', response: 'What is talk to them?' },
        { value: 800, clue: 'This 2004 live-action movie starred a CGI version of the lasagna-loving comic-strip cat.', response: 'What is Garfield?' },
        { value: 1000, clue: 'King Julien, the "I Like to Move It" party animal of Madagascar, is this type of primate.', response: 'What is a (ring-tailed) lemur?' }
      ]
    },
    {
      name: 'Animal Anthems',
      clues: [
        { value: 200, clue: 'Baha Men’s 2000 hit repeatedly asks who let these animals out.', response: 'What are the dogs?' },
        { value: 400, clue: 'In 2005 this blue cartoon amphibian’s version of "Axel F" topped European charts.', response: 'Who is Crazy Frog?' },
        { value: 600, clue: 'This circa-2000 looping website featured a row of rodents dancing to a sped-up tune.', response: 'What is the Hampster Dance?' },
        { value: 800, clue: 'Crazy Frog’s "Axel F" is a remix of the theme from this 1984 Eddie Murphy cop comedy.', response: 'What is Beverly Hills Cop?' },
        { value: 1000, clue: 'The Baha Men of "Who Let the Dogs Out" fame hail from this island nation.', response: 'What are the Bahamas?' }
      ]
    },
    {
      name: 'Viral & Web Beasts',
      clues: [
        { value: 200, clue: 'This yellow electric mouse is the franchise mascot of Pokémon.', response: 'Who is Pikachu?' },
        { value: 400, clue: 'A 2003 Weebl flash cartoon endlessly chants this woodland animal’s name (with "mushroom mushroom").', response: 'What is a badger?' },
        { value: 600, clue: 'Released in North America in 2002, this GameCube life-sim is full of talking animal villagers.', response: 'What is Animal Crossing?' },
        { value: 800, clue: 'This 2007 site captioned cat photos with misspelled gems like "I Can Has Cheezburger?"', response: 'What is I Can Has Cheezburger? (lolcats)' },
        { value: 1000, clue: 'This 2007 viral video paired a piano-"playing" feline with the phrase "play him off."', response: 'Who is Keyboard Cat?' }
      ]
    },
    {
      name: 'Real Famous Animals',
      clues: [
        { value: 200, clue: 'Every February 2, this Pennsylvania groundhog "predicts" the weather.', response: 'Who is Punxsutawney Phil?' },
        { value: 400, clue: '"Crocodile Hunter" Steve Irwin was a beloved wildlife expert from this country.', response: 'What is Australia?' },
        { value: 600, clue: 'This is Steve Irwin’s signature one-word exclamation of excitement.', response: 'What is "Crikey!"?' },
        { value: 800, clue: 'In 2006 this Berlin Zoo polar bear cub became a worldwide media sensation.', response: 'Who is Knut?' },
        { value: 1000, clue: 'In 2002’s "The Crocodile Hunter: Collision Course," Irwin co-starred with this real-life wife.', response: 'Who is Terri Irwin?' }
      ]
    }
  ],
  final: {
    category: 'Animated Animal Friends',
    clue: 'Voiced by Ellen DeGeneres, this forgetful blue tang debuted in a 2003 Pixar film and headlined a 2016 sequel of her own.',
    response: 'Who is Dory?'
  }
}
