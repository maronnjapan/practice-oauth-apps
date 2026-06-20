import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
    test: {
        globals: true,
        poolOptions: {
            workers: {
                wrangler: { configPath: "./wrangler.jsonc" },
                miniflare: {
                    bindings: {
                        // テスト専用に生成した鍵（本番・ローカル開発の鍵とは必ず別にすること）
                        PRIVATE_KEY: '{"key_ops":["sign"],"ext":true,"kty":"RSA","n":"7uVjmMX2MDPvyXxzw4b1QznV1pkASGBrKh__nax1zTA7PO--i9feyst9IgdeuSXi1dmAUiFnnwwSZl5ZDQ0LvTnw7YUIk159X1Jt2DEmfTjkNf6UThDokPZSzSswFkhfwY8QbODczgTZRSO_A0PC3Uvvztg1DDSZWiSoxbBWJurvlVkx0qg6Xj3tUlcAbeBPl3eOaQ1LOX9Xx7QCe5kljsQKDC4obP4hTPs5w43BAI3yVmVQjMdbHZvA95d9uyNSH5DjfkaAWb7jgzUDGy-JlfSxwbBDgW_PNpCl0Ybq0YQmqlZCJkNW19OPB_gKX5m0_i11olyWtcv0iubBjlDCtQ","e":"AQAB","d":"AgiyjLcjy_XA5mTZ7_xBC3_eWIx4Knmz6QTzGNeAh32MeqdwpKNHJr3ApYUNX2x-99mhhcLc9pQsJdF2tgjdIQ1FkSmCgHtk6eZhuOVeO9L2OKAYa8E4U_l2-iBNBY3VBfdzC9oKNWeUZHI8Mh3ZP9AJ6nCoYiqprgukWAxCV_pEI9dVgkDazcMx3sujRDivuAGTIEjRYg1B-InlM7Oaz8wUnau427_ZvM3-UkAI-H8coEb8w0hMVgGb2qpj_xEJKNXbvVySJ5meaKaU2l7L5CXQWFa620_HTzlpxxzmNfObwYIY-pDmKJlO_Fnv1iFt44fH1B3RtZUm5OSYCw-Ixw","p":"_zd-WZ5equVOqBoSaO_cgODsVNYOhDwXpB7EvVQbouRoO3M0jX_dcx0QlQgoXRo7g6WWPXrv4n-FDQN_n0zVYaegCWQuvEtZ-c9iqLSMXUo-_eEaWiU791T0Pi4djYi04Ut_qg6S3jYi2mls12Zak-GuU4UGT0fpU3_LGuXNk4M","q":"76ESy10kqryKsBp4CjjsLkvTM4fCxNxNBb1adVXkDsRSxPPU1f4ZUcsvJig_lSqIbAWD_bDReo_kNT1yYvTflm8LjwBejNZf5sRcxPEUFiliGBzPdZt14VFqPPcUavdESuUCvhc78jZ1jEbsbfaP3-VgeNCSd6d0k0WpfJg6o2c","dp":"W4y3iURTJzCMj6aSlgv86EpG3IPQv0SjIl9bKaNDKqKOdUz1PBDzCjkR2rQLbqJbWPUMOM-hv3kI7Esl-6nfHWG4-cVzMl5BT2hCNsxVUZ2xjPazskSLB0T1PFzkgwHYCL1BdWo26vk2dWy9-2Ke-U9KbnFYexYLr8U2wVZP8Ss","dq":"b6E3oikX5bnDWdpaxVhTHhYQo1bBMvf1oZDeTP7gKMjoTfvQ0Id4wBPJORtS02hm-Ptwy4PNci0KAItJeDPe3LOKTOm9IhrTvisHlG9CDjjlC5qQQpdTSM2mkhQAHPxnggRBTNCCCom4JMr9ZRSRXZn7YQy4zqjhs6GmHPbFik0","qi":"t9AwzdqSyZwBGaI9kTcaVAFOFlLiUwcB3e-hUJaK7RU8T8K2Tbquv52PXeVBygsvsEZgcugfeUnpiHBZyoMNzutN1eDnoXSvKe7MUrI0eh2_TDBoUEbWJ2KEilkkEeOgZ0JM7vzRtNxZD4VKA1BuXFctTdOMXC9pYJKvKfDHKuA","alg":"RS256"}',
                        // テスト用秘密鍵と対になる公開鍵
                        PUBLIC_KEY: '{"key_ops":["verify"],"ext":true,"kty":"RSA","n":"7uVjmMX2MDPvyXxzw4b1QznV1pkASGBrKh__nax1zTA7PO--i9feyst9IgdeuSXi1dmAUiFnnwwSZl5ZDQ0LvTnw7YUIk159X1Jt2DEmfTjkNf6UThDokPZSzSswFkhfwY8QbODczgTZRSO_A0PC3Uvvztg1DDSZWiSoxbBWJurvlVkx0qg6Xj3tUlcAbeBPl3eOaQ1LOX9Xx7QCe5kljsQKDC4obP4hTPs5w43BAI3yVmVQjMdbHZvA95d9uyNSH5DjfkaAWb7jgzUDGy-JlfSxwbBDgW_PNpCl0Ybq0YQmqlZCJkNW19OPB_gKX5m0_i11olyWtcv0iubBjlDCtQ","e":"AQAB","alg":"RS256"}',
                        AUTHORIZATION_SERVER_ISSUER: 'http://localhost:8787',
                        RESOURCE_SERVER_IDENTIFIER: 'http://localhost:8789/api'
                    },
                },
            },
        },
    }
})
