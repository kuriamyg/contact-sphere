import { section } from '../section';

export const auth = section(
  {
    signInTitle: 'Sign in',
    signInLead: 'Your contacts are private to your account.',
    accountDeleted:
      'Your account and all its data have been deleted, and this phone’s offline copy is gone too.',
    legalLinks: 'Privacy · Terms',
    agree: 'By creating an account you agree to the {terms} and the {privacy}.',
    termsLink: 'terms of use',
    privacyLink: 'privacy policy',
    privacy: 'Privacy',
    terms: 'Terms',
    firstTime: 'First time here?',
    createOwner: 'Create the owner account',
    setupTitle: 'Create the owner account',
    setupLead:
      'This page works once. After the first account exists, it closes for good.',
    verifyTitle: 'Two-factor verification',
    verifyLead: 'Open your authenticator app and enter the current code.',
    startAgain: 'Start again',
    newHere: 'New here?',
    createAccount: 'Create an account',
    forgot: 'Forgot your password?',
    haveAccount: 'Already have an account?',
    signInLink: 'Sign in',
    signUpTitle: 'Create your account',
    signUpLead:
      'Sign up with your mobile number. We verify it with a one-time code by SMS — no email needed.',
    resetTitle: 'Reset your password',
    resetLead:
      'Enter the mobile number you sign in with. If it has an account, we send a verification code to it by SMS.',
    passwordReset:
      'Your password has been changed and every device signed out. Sign in with the new one.',
    android: {
      title: 'Contact Sphere for Android',
      lead: 'The app on your phone: sign in with Google or your phone number, bring in your phone’s contacts, and put Contact Sphere contacts in your phone’s Contacts.',
      download: 'Download the app (4 MB)',
      steps: [
        'Tap “Download the app”, then open the file when it finishes.',
        'If Android asks, allow Chrome to install apps from this source.',
        'Samsung: if it says the install is blocked, turn off Auto Blocker for a moment (Settings → Security and privacy → Auto Blocker), then turn it back on.',
        'If Play Protect warns about an unknown app, tap More details → Install anyway.',
        'Open Contact Sphere and sign in.',
      ],
      testing:
        'This is a test version from our own site, before Google Play. Android 7 or newer. If you had an earlier test version, uninstall it first.',
      iphone: 'On an iPhone or a computer?',
      useWeb: 'Use Contact Sphere in your browser.',
    },
    continueWithGoogle: 'Continue with Google',
    appReturnTitle: 'Signed in with Google',
    appReturnBody: 'Go back to the Contact Sphere app to finish.',
    appReturnButton: 'Open Contact Sphere',
    appReturnFailed:
      'That sign-in did not work. Go back to the app and try again.',
    googleInApp:
      'Google sign-in is coming to the app in the next update. For now, use your phone number and password here — or open Contact Sphere in Chrome to continue with Google.',
    or: 'or',
    signUpLeadGoogle:
      'Use your Google account — no new password to remember. Your contacts stay private to you.',
    google: {
      cancelled: 'Google sign-in was cancelled.',
      expired: 'That took too long. Try Continue with Google again.',
      failed: 'Signing in with Google did not work. Try again.',
      'no-account':
        'There is no Contact Sphere account for that Google account.',
      unverified:
        'Google has not verified the email on that account yet. Verify it with Google, then try again.',
      taken:
        'That email already belongs to an account linked to a different Google account.',
    },
    alreadySignedInTitle: 'You’re already signed in',
    alreadySignedIn: 'Signed in as {name}.',
    continueToApp: 'Continue to Contact Sphere',
    notYou: 'Not {name}?',
    signOut: 'Sign out',
    signUpLeadPassword:
      'Use your mobile number and a password you will remember. No code, no email needed.',
    signUpLeadBoth:
      'Continue with Google, or use your mobile number and a password.',
    recoveryKeyTitle: 'Save your recovery key',
    recoveryKeySaved: 'I’ve saved it',
    recoveryKeyLead:
      'If you forget your password, this key and your number are the only way back in. It is shown once. Write it down or keep a screenshot somewhere safe — never share it.',
    newRecoveryKeyTitle: 'Recovery key',
    newRecoveryKeyLead:
      'Lost your key? Make a new one. The old key stops working at once.',
    resetLeadKey:
      'Enter your number, the recovery key you saved when you signed up, and a new password.',
    resetWithSms: 'No recovery key? Get a code by SMS instead',
  },
  {
    signInTitle: 'Ingia',
    signInLead: 'Anwani zako ni za faragha, kwa akaunti yako pekee.',
    accountDeleted:
      'Akaunti yako na data yake yote zimefutwa, na nakala ya simu hii ya bila mtandao imeondolewa pia.',
    legalLinks: 'Faragha · Masharti',
    agree: 'Kwa kuunda akaunti unakubali {terms} na {privacy}.',
    termsLink: 'masharti ya matumizi',
    privacyLink: 'sera ya faragha',
    privacy: 'Faragha',
    terms: 'Masharti',
    firstTime: 'Mara yako ya kwanza?',
    createOwner: 'Unda akaunti ya mmiliki',
    setupTitle: 'Unda akaunti ya mmiliki',
    setupLead:
      'Ukurasa huu hufanya kazi mara moja tu. Akaunti ya kwanza ikishaundwa, hufungwa kabisa.',
    verifyTitle: 'Uthibitisho wa hatua mbili',
    verifyLead:
      'Fungua programu yako ya uthibitishaji na uweke msimbo wa sasa.',
    startAgain: 'Anza upya',
    newHere: 'Mgeni hapa?',
    createAccount: 'Fungua akaunti',
    forgot: 'Umesahau nenosiri?',
    haveAccount: 'Tayari una akaunti?',
    signInLink: 'Ingia',
    signUpTitle: 'Fungua akaunti yako',
    signUpLead:
      'Jisajili kwa nambari yako ya simu. Tunaithibitisha kwa msimbo wa mara moja kwa SMS — hakuna barua pepe inayohitajika.',
    resetTitle: 'Weka upya nenosiri lako',
    resetLead:
      'Weka nambari ya simu unayoingia nayo. Ikiwa ina akaunti, tutaitumia msimbo wa uthibitisho kwa SMS.',
    passwordReset:
      'Nenosiri lako limebadilishwa na vifaa vyote vimetolewa. Ingia kwa nenosiri jipya.',
    android: {
      title: 'Contact Sphere kwa Android',
      lead: 'Programu kwenye simu yako: ingia kwa Google au nambari yako ya simu, leta anwani za simu yako, na weka anwani za Contact Sphere kwenye Anwani za simu yako.',
      download: 'Pakua programu (MB 4)',
      steps: [
        'Gusa “Pakua programu”, kisha fungua faili likimaliza kupakuliwa.',
        'Android ikiuliza, ruhusu Chrome kusakinisha programu kutoka chanzo hiki.',
        'Samsung: ikisema usakinishaji umezuiwa, zima Auto Blocker kwa muda (Mipangilio → Usalama na faragha → Auto Blocker), kisha iwashe tena.',
        'Play Protect ikionya kuhusu programu isiyojulikana, gusa Maelezo zaidi → Sakinisha hata hivyo.',
        'Fungua Contact Sphere na uingie.',
      ],
      testing:
        'Hili ni toleo la majaribio kutoka tovuti yetu, kabla ya Google Play. Android 7 au mpya zaidi. Kama ulikuwa na toleo la awali la majaribio, liondoe kwanza.',
      iphone: 'Uko kwenye iPhone au kompyuta?',
      useWeb: 'Tumia Contact Sphere kwenye kivinjari chako.',
    },
    continueWithGoogle: 'Endelea na Google',
    appReturnTitle: 'Umeingia kwa Google',
    appReturnBody: 'Rudi kwenye programu ya Contact Sphere kumaliza.',
    appReturnButton: 'Fungua Contact Sphere',
    appReturnFailed:
      'Kuingia huko hakukufanikiwa. Rudi kwenye programu ujaribu tena.',
    googleInApp:
      'Kuingia kwa Google kunakuja kwenye programu katika sasisho lijalo. Kwa sasa, tumia nambari yako ya simu na nenosiri hapa — au fungua Contact Sphere kwenye Chrome kuendelea na Google.',
    or: 'au',
    signUpLeadGoogle:
      'Tumia akaunti yako ya Google — hakuna nenosiri jipya la kukumbuka. Anwani zako zinabaki za faragha kwako.',
    google: {
      cancelled: 'Kuingia kwa Google kumesitishwa.',
      expired: 'Imechukua muda mrefu mno. Jaribu Endelea na Google tena.',
      failed: 'Kuingia kwa Google hakukufaulu. Jaribu tena.',
      'no-account':
        'Hakuna akaunti ya Contact Sphere kwa akaunti hiyo ya Google.',
      unverified:
        'Google bado haijathibitisha barua pepe ya akaunti hiyo. Ithibitishe kwa Google, kisha ujaribu tena.',
      taken:
        'Barua pepe hiyo tayari ni ya akaunti iliyounganishwa na akaunti nyingine ya Google.',
    },
    alreadySignedInTitle: 'Tayari umeingia',
    alreadySignedIn: 'Umeingia kama {name}.',
    continueToApp: 'Endelea kwenye Contact Sphere',
    notYou: 'Si {name}?',
    signOut: 'Toka',
    signUpLeadPassword:
      'Tumia nambari yako ya simu na nenosiri utakalokumbuka. Hakuna msimbo wala barua pepe inayohitajika.',
    signUpLeadBoth:
      'Endelea na Google, au tumia nambari yako ya simu na nenosiri.',
    recoveryKeyTitle: 'Hifadhi ufunguo wako wa kurejesha',
    recoveryKeySaved: 'Nimeuhifadhi',
    recoveryKeyLead:
      'Ukisahau nenosiri, ufunguo huu na nambari yako ndiyo njia pekee ya kuingia tena. Unaonyeshwa mara moja. Uandike au uhifadhi picha ya skrini mahali salama — usimpe mtu yeyote.',
    newRecoveryKeyTitle: 'Ufunguo wa kurejesha',
    newRecoveryKeyLead:
      'Umepoteza ufunguo? Tengeneza mpya. Ufunguo wa zamani unaacha kufanya kazi mara moja.',
    resetLeadKey:
      'Weka nambari yako, ufunguo wa kurejesha uliouhifadhi ulipojisajili, na nenosiri jipya.',
    resetWithSms: 'Huna ufunguo? Pata msimbo kwa SMS badala yake',
  },
);
