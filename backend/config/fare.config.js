const fareConfig = {
    general: {
        bike: {
            baseFare: 30,
            includedKm: 2,
            perKm: 9
        },

        auto: {
            baseFare: 45,
            includedKm: 2,
            perKm: 14
        },

        car: {
            baseFare: 75,
            includedKm: 2,
            perKm: 16
        }
    },

    zoneOverrides: {
        "east-champaran": {
            bike: {
                perKm: 8
            }
        },

        "west-champaran": {
            bike: {
                perKm: 8
            }
        },

        "aurangabad": {
            bike: {
                perKm: 8
            }
        }
    },

    peakPlatformFee: {
        enabled: false,
        minFee: 5,
        maxFee: 10
    },

    driverMonetization: {
        mode: "daily_subscription",

        dailySubscription: {
            amount: 15
        },

        rideCommission: {
            percentage: 8
        }
    }
};

module.exports = fareConfig;