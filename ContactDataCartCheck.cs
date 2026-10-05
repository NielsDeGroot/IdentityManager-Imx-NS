using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using QBM.CompositionApi.Serialization;
using QER.CompositionApi.ITShop.Check;

using VI.Base;
using VI.DB;
using VI.DB.Entities;

namespace CCC.ContactValidation
{
    public class ContactDataCartCheckProvider :
        ICartCheckProvider,
        IKnownTypeProvider
    {
        public IEnumerable<Type> GetTypes()
        {
            return new[]
            {
                typeof(ContactDataItemCheck)
            };
        }

        public ICartCheck GetCartCheck(
            ICartItemCheckContext context)
        {
            return new ContactDataCartCheck(context);
        }
    }


    public class ContactDataCartCheck : ICartCheck
    {
        private readonly ICartItemCheckContext _context;
        private ContactDataItemCheck _check;


        public ContactDataCartCheck(
            ICartItemCheckContext context)
        {
            _context = context;
        }


        public IReadOnlyList<ICartItemCheck> GetItemChecks()
        {
            _check = new ContactDataItemCheck(_context);

            return new ICartItemCheck[]
            {
                _check
            };
        }


        public Task CheckAsync(
            CancellationToken ct = default(CancellationToken))
        {
            return _check.ProcessAsync(ct);
        }
    }


    public class ContactDataItemCheck : ICartItemCheck
    {
        private readonly ICartItemCheckContext _context;


        public ContactDataItemCheck()
        {
        }


        public ContactDataItemCheck(
            ICartItemCheckContext context)
        {
            _context = context;
        }


        internal async Task ProcessAsync(
            CancellationToken ct = default(CancellationToken))
        {
            if (_context == null)
            {
                return;
            }


            Status = CheckStatus.Success;
            ResultText = string.Empty;

            var session = _context.Session;
            var cartItem = _context.Item;


            // ============================================================
            // 1. Get product
            // ============================================================

            var uidAccProduct = cartItem.UidAccProduct;

            if (string.IsNullOrWhiteSpace(uidAccProduct))
            {
                return;
            }


            // ============================================================
            // 2. Load product and check CustomProperty01
            // ============================================================

            var productQuery = Query
                .From("AccProduct")
                .Where(
                    session
                        .SqlFormatter()
                        .UidComparison(
                            "UID_AccProduct",
                            uidAccProduct))
                .Select(
                    "UID_AccProduct",
                    "CustomProperty01");


            var products = await session
                .Source()
                .GetCollectionAsync(
                    productQuery,
                    EntityCollectionLoadType.ForeignDisplaysForAllColumns |
                    EntityCollectionLoadType.LoadForeignDisplaysEvenWhenExpensive,
                    ct)
                .ConfigureAwait(false);


            IEntity product = null;

            foreach (var item in products)
            {
                product = item;
                break;
            }


            if (product == null)
            {
                return;
            }


            var customProperty01 = await GetStringAsync(
                    product,
                    "CustomProperty01",
                    ct)
                .ConfigureAwait(false);


            // Only apply validation to configured products
            if (!string.Equals(
                    customProperty01,
                    "DerdeValidation",
                    StringComparison.OrdinalIgnoreCase))
            {
                return;
            }


            // ============================================================
            // 3. Get recipient
            // ============================================================

            var uidPersonOrdered = cartItem.UidPersonOrdered;

            if (string.IsNullOrWhiteSpace(uidPersonOrdered))
            {
                return;
            }


            // ============================================================
            // 4. Load recipient
            // ============================================================

            var personQuery = Query
                .From("Person")
                .Where(
                    session
                        .SqlFormatter()
                        .UidComparison(
                            "UID_Person",
                            uidPersonOrdered))
                .Select(
                    "UID_Person",
                    "ImportSource",
                    "ContactEmail",
                    "PhoneMobile",
                    "InternalName");


            var persons = await session
                .Source()
                .GetCollectionAsync(
                    personQuery,
                    EntityCollectionLoadType.ForeignDisplaysForAllColumns |
                    EntityCollectionLoadType.LoadForeignDisplaysEvenWhenExpensive,
                    ct)
                .ConfigureAwait(false);


            IEntity person = null;

            foreach (var item in persons)
            {
                person = item;
                break;
            }


            if (person == null)
            {
                return;
            }


            // ============================================================
            // 5. Only validate DERDE identities
            // ============================================================

            var importSource = await GetStringAsync(
                    person,
                    "ImportSource",
                    ct)
                .ConfigureAwait(false);


            if (!string.Equals(
                    importSource,
                    "DERDE",
                    StringComparison.OrdinalIgnoreCase))
            {
                return;
            }


            // ============================================================
            // 6. Get contact data
            // ============================================================

            var contactEmail = await GetStringAsync(
                    person,
                    "ContactEmail",
                    ct)
                .ConfigureAwait(false);


            var phoneMobile = await GetStringAsync(
                    person,
                    "PhoneMobile",
                    ct)
                .ConfigureAwait(false);


            var internalName = await GetStringAsync(
                    person,
                    "InternalName",
                    ct)
                .ConfigureAwait(false);


            if (string.IsNullOrWhiteSpace(internalName))
            {
                internalName = uidPersonOrdered;
            }


            // ============================================================
            // 7. Validate contact information
            // ============================================================

            var missingContactEmail =
                string.IsNullOrWhiteSpace(contactEmail);

            var missingPhoneMobile =
                string.IsNullOrWhiteSpace(phoneMobile);


            if (!missingContactEmail &&
                !missingPhoneMobile)
            {
                return;
            }


            // ============================================================
            // 8. Validation failed
            // ============================================================

            Status = CheckStatus.Error;


            // ------------------------------------------------------------
            // Missing both
            // ------------------------------------------------------------

            if (missingContactEmail &&
                missingPhoneMobile)
            {
                ResultText = await TranslateAndFormatAsync(
                        session,
                        "The request cannot be submitted for {0}, the recipient is missing a mobile phone number and contact email address.",
                        internalName,
                        ct)
                    .ConfigureAwait(false);

                return;
            }


            // ------------------------------------------------------------
            // Missing contact email
            // ------------------------------------------------------------

            if (missingContactEmail)
            {
                ResultText = await TranslateAndFormatAsync(
                        session,
                        "The request cannot be submitted for {0}, the recipient is missing a contact email address.",
                        internalName,
                        ct)
                    .ConfigureAwait(false);

                return;
            }


            // ------------------------------------------------------------
            // Missing mobile phone
            // ------------------------------------------------------------

            if (missingPhoneMobile)
            {
                ResultText = await TranslateAndFormatAsync(
                        session,
                        "The request cannot be submitted for {0}, the recipient is missing a mobile phone number.",
                        internalName,
                        ct)
                    .ConfigureAwait(false);
            }
        }


        // ================================================================
        // Translation
        //
        // IMPORTANT:
        //
        // 1. Keep {0} in the EntryKey.
        // 2. Look up the translated EntryValue.
        // 3. Only then replace {0} with InternalName.
        //
        // Any translation failure falls back to English so that a
        // translation problem can never break the shopping cart.
        // ================================================================

        private static async Task<string> TranslateAndFormatAsync(
            ISession session,
            string entryKey,
            string parameter0,
            CancellationToken ct)
        {
            var translatedTemplate = entryKey;

            try
            {
                if (session == null)
                {
                    return string.Format(
                        entryKey,
                        parameter0);
                }


                var formatter = session.SqlFormatter();


                // ========================================================
                // Get current logged-in portal user
                // ========================================================

                var uidLoggedInPerson = session.User().Uid;

                if (string.IsNullOrWhiteSpace(uidLoggedInPerson))
                {
                    return string.Format(
                        entryKey,
                        parameter0);
                }


                // ========================================================
                // Get language configured on logged-in Person
                // ========================================================

                var userQuery = Query
                    .From("Person")
                    .Where(
                        formatter.UidComparison(
                            "UID_Person",
                            uidLoggedInPerson))
                    .Select(
                        "UID_DialogCulture");


                var users = await session
                    .Source()
                    .GetCollectionAsync(
                        userQuery,
                        EntityCollectionLoadType.ForeignDisplaysForAllColumns |
                        EntityCollectionLoadType.LoadForeignDisplaysEvenWhenExpensive,
                        ct)
                    .ConfigureAwait(false);


                string uidDialogCulture = null;


                foreach (var user in users)
                {
                    uidDialogCulture = await GetStringAsync(
                            user,
                            "UID_DialogCulture",
                            ct)
                        .ConfigureAwait(false);

                    break;
                }


                // If no language is configured, just use English.
                if (string.IsNullOrWhiteSpace(uidDialogCulture))
                {
                    return string.Format(
                        entryKey,
                        parameter0);
                }


                // ========================================================
                // Look up translation
                //
                // EntryKey still contains {0} here.
                // ========================================================

                var translationQuery = Query
                    .From("DialogMultiLanguage")
                    .Where(
                        formatter.UidComparison(
                            "UID_DialogCulture",
                            uidDialogCulture))
                    .Where(
                        formatter.Comparison(
                            "EntryKey",
                            entryKey,
                            ValType.String,
                            CompareOperator.Equal))
                    .Select(
                        "EntryValue");


                var translations = await session
                    .Source()
                    .GetCollectionAsync(
                        translationQuery,
                        EntityCollectionLoadType.ForeignDisplaysForAllColumns |
                        EntityCollectionLoadType.LoadForeignDisplaysEvenWhenExpensive,
                        ct)
                    .ConfigureAwait(false);


                foreach (var translation in translations)
                {
                    var entryValue = await GetStringAsync(
                            translation,
                            "EntryValue",
                            ct)
                        .ConfigureAwait(false);


                    if (!string.IsNullOrWhiteSpace(entryValue))
                    {
                        translatedTemplate = entryValue;
                        break;
                    }
                }
            }
            catch
            {
                // Never allow translation to break Shopping Cart.
                translatedTemplate = entryKey;
            }


            // ============================================================
            // Replace {0} only AFTER translation
            // ============================================================

            try
            {
                return string.Format(
                    translatedTemplate,
                    parameter0);
            }
            catch
            {
                return string.Format(
                    entryKey,
                    parameter0);
            }
        }


        private static async Task<string> GetStringAsync(
            IEntity entity,
            string columnName,
            CancellationToken ct)
        {
            var value = await entity
                .Columns[columnName]
                .GetValueAsync<string>(ct)
                .ConfigureAwait(false);

            return value ?? string.Empty;
        }


        public string Id
        {
            get
            {
                return "CCC_RecipientContactValidation";
            }
        }


        public CheckStatus Status { get; set; }


        public string Title
        {
            get
            {
                return "Recipient contact information check";
            }
        }


        public string ResultText { get; set; }


        public object Detail
        {
            get
            {
                return null;
            }
        }
    }
}