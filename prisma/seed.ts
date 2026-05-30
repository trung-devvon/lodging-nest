

// for local development only


import { PrismaClient, UserRole, BusinessType, OrganizationStatus, SubscriptionPlanName, SubscriptionStatus, Region, RoomType, BedType, RoomStatus, BookingSource, StaffRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// PLACEHOLDER IMAGES
// ─────────────────────────────────────────────
const IMAGES = [
    'https://i1-e.pinimg.com/736x/23/fb/e2/23fbe207a30d8477e52df4db432c6624.jpg',
    'https://i1-e.pinimg.com/1200x/ae/cd/8c/aecd8cad7461632b0978ee9796d5e2cf.jpg',
    'https://i1-e.pinimg.com/736x/57/59/55/5759553624dad5cc27e6c3be18599b54.jpg',
];

async function main() {
    console.log('🌱 Bắt đầu seed...\n');

    // ─────────────────────────────────────────────
    // NHÓM 1 — BẮT BUỘC
    // ─────────────────────────────────────────────

    // 1. PROVINCES
    console.log('📍 Seeding provinces...');
    const provinces = await Promise.all([
        prisma.province.upsert({
            where: { slug: 'ho-chi-minh' },
            update: {},
            create: { name: 'TP. Hồ Chí Minh', slug: 'ho-chi-minh', region: Region.SOUTH, isActive: true, sortOrder: 1 },
        }),
        prisma.province.upsert({
            where: { slug: 'ha-noi' },
            update: {},
            create: { name: 'Hà Nội', slug: 'ha-noi', region: Region.NORTH, isActive: true, sortOrder: 2 },
        }),
        prisma.province.upsert({
            where: { slug: 'da-nang' },
            update: {},
            create: { name: 'Đà Nẵng', slug: 'da-nang', region: Region.CENTRAL, isActive: true, sortOrder: 3 },
        }),
        prisma.province.upsert({
            where: { slug: 'vung-tau' },
            update: {},
            create: { name: 'Vũng Tàu', slug: 'vung-tau', region: Region.SOUTH, isActive: true, sortOrder: 4 },
        }),
        prisma.province.upsert({
            where: { slug: 'da-lat' },
            update: {},
            create: { name: 'Đà Lạt', slug: 'da-lat', region: Region.CENTRAL, isActive: true, sortOrder: 5 },
        }),
        prisma.province.upsert({
            where: { slug: 'nha-trang' },
            update: {},
            create: { name: 'Nha Trang', slug: 'nha-trang', region: Region.CENTRAL, isActive: true, sortOrder: 6 },
        }),
        prisma.province.upsert({
            where: { slug: 'phu-quoc' },
            update: {},
            create: { name: 'Phú Quốc', slug: 'phu-quoc', region: Region.SOUTH, isActive: true, sortOrder: 7 },
        }),
        prisma.province.upsert({
            where: { slug: 'hoi-an' },
            update: {},
            create: { name: 'Hội An', slug: 'hoi-an', region: Region.CENTRAL, isActive: true, sortOrder: 8 },
        }),
        prisma.province.upsert({
            where: { slug: 'ha-long' },
            update: {},
            create: { name: 'Hạ Long', slug: 'ha-long', region: Region.NORTH, isActive: true, sortOrder: 9 },
        }),
        prisma.province.upsert({
            where: { slug: 'sapa' },
            update: {},
            create: { name: 'Sa Pa', slug: 'sapa', region: Region.NORTH, isActive: true, sortOrder: 10 },
        }),
    ]);
    console.log(`   ✅ ${provinces.length} tỉnh/thành\n`);

    // 2. SUBSCRIPTION PLANS
    console.log('📦 Seeding subscription plans...');
    const plans = await Promise.all([
        prisma.subscriptionPlan.upsert({
            where: { name: SubscriptionPlanName.LU_HANH },
            update: {},
            create: {
                name: SubscriptionPlanName.LU_HANH,
                displayName: 'Lữ Hành',
                monthlyPrice: 0,
                yearlyPrice: 0,
                maxBranches: 1,
                maxRoomsPerBranch: 5,
                canListOnMarketplace: false,
                hasAdvancedReports: false,
                hasPrioritySupport: false,
                isActive: true,
            },
        }),
        prisma.subscriptionPlan.upsert({
            where: { name: SubscriptionPlanName.TRU_CHAN },
            update: {},
            create: {
                name: SubscriptionPlanName.TRU_CHAN,
                displayName: 'Trú Chân',
                monthlyPrice: 299000,
                yearlyPrice: 2990000,
                maxBranches: 1,
                maxRoomsPerBranch: -1,
                canListOnMarketplace: true,
                hasAdvancedReports: false,
                hasPrioritySupport: false,
                isActive: true,
            },
        }),
        prisma.subscriptionPlan.upsert({
            where: { name: SubscriptionPlanName.AN_CU },
            update: {},
            create: {
                name: SubscriptionPlanName.AN_CU,
                displayName: 'An Cư',
                monthlyPrice: 699000,
                yearlyPrice: 6990000,
                maxBranches: 5,
                maxRoomsPerBranch: -1,
                canListOnMarketplace: true,
                hasAdvancedReports: true,
                hasPrioritySupport: false,
                isActive: true,
            },
        }),
        prisma.subscriptionPlan.upsert({
            where: { name: SubscriptionPlanName.BAN_DIA },
            update: {},
            create: {
                name: SubscriptionPlanName.BAN_DIA,
                displayName: 'Bản Địa',
                monthlyPrice: 1499000,
                yearlyPrice: 14990000,
                maxBranches: -1,
                maxRoomsPerBranch: -1,
                canListOnMarketplace: true,
                hasAdvancedReports: true,
                hasPrioritySupport: true,
                isActive: true,
            },
        }),
    ]);
    console.log(`   ✅ ${plans.length} gói đăng ký\n`);

    // 3. SUPER ADMIN
    console.log('👤 Seeding super admin...');
    const superAdminHash = await argon2.hash('SuperAdmin@123');
    const superAdmin = await prisma.user.upsert({
        where: { email: 'superadmin@system.local' },
        update: {},
        create: {
            email: 'superadmin@system.local',
            passwordHash: superAdminHash,
            phone: '0900000000',
            role: UserRole.SUPER_ADMIN,
            isActive: true,
            isEmailVerified: true,
        },
    });
    console.log(`   ✅ Super Admin: ${superAdmin.email}\n`);

    // ─────────────────────────────────────────────
    // NHÓM 2 — DỮ LIỆU MẪU ĐỂ TEST
    // ─────────────────────────────────────────────

    // 4. ORG OWNER
    console.log('👤 Seeding org owner...');
    const orgOwnerHash = await argon2.hash('OrgOwner@123');
    const orgOwner = await prisma.user.upsert({
        where: { email: 'owner@vietstaydemo.vn' },
        update: {},
        create: {
            email: 'owner@vietstaydemo.vn',
            passwordHash: orgOwnerHash,
            phone: '0901234567',
            role: UserRole.ORG_OWNER,
            isActive: true,
            isEmailVerified: true,
        },
    });
    console.log(`   ✅ Org Owner: ${orgOwner.email}\n`);

    // 5. ORGANIZATION
    console.log('🏢 Seeding organization...');
    const org = await prisma.organization.upsert({
        where: { slug: 'vietstay-demo' },
        update: {},
        create: {
            ownerId: orgOwner.id,
            name: 'VietStay Demo',
            slug: 'vietstay-demo',
            taxCode: '0123456789',
            businessType: BusinessType.HOMESTAY,
            status: OrganizationStatus.ACTIVE,
        },
    });
    console.log(`   ✅ Organization: ${org.name}\n`);

    // 6. SUBSCRIPTION
    console.log('💳 Seeding subscription...');
    const planAnCu = plans.find(p => p.name === SubscriptionPlanName.AN_CU)!;
    const now = new Date();
    const nextYear = new Date(now);
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    const existingSub = await prisma.subscription.findFirst({
        where: { organizationId: org.id },
    });
    if (!existingSub) {
        await prisma.subscription.create({
            data: {
                organizationId: org.id,
                planId: planAnCu.id,
                status: SubscriptionStatus.ACTIVE,
                currentPeriodStart: now,
                currentPeriodEnd: nextYear,
            },
        });
    }
    console.log(`   ✅ Subscription: gói ${planAnCu.displayName}\n`);

    // 7. BRANCH
    console.log('🏨 Seeding branches...');
    const provinceHCM = provinces.find(p => p.slug === 'ho-chi-minh')!;
    const provinceDaLat = provinces.find(p => p.slug === 'da-lat')!;

    const branch1 = await prisma.branch.upsert({
        where: { id: 'branch-hcm-demo-001' },
        update: {},
        create: {
            id: 'branch-hcm-demo-001',
            organizationId: org.id,
            provinceId: provinceHCM.id,
            name: 'VietStay Sài Gòn',
            address: '123 Nguyễn Huệ, Phường Bến Nghé',
            district: 'Quận 1',
            latitude: 10.7769,
            longitude: 106.7009,
            description: 'Homestay trung tâm Sài Gòn, gần các địa điểm du lịch nổi tiếng.',
            amenities: ['Wifi', 'Điều hòa', 'Bãi đỗ xe', 'Lễ tân 24/7'],
            checkInTime: '14:00',
            checkOutTime: '12:00',
            bufferHours: 2,
            isActive: true,
            isListedOnMarketplace: true,
        },
    });

    const branch2 = await prisma.branch.upsert({
        where: { id: 'branch-dalat-demo-001' },
        update: {},
        create: {
            id: 'branch-dalat-demo-001',
            organizationId: org.id,
            provinceId: provinceDaLat.id,
            name: 'VietStay Đà Lạt',
            address: '45 Trần Phú, Phường 4',
            district: 'Trung tâm',
            latitude: 11.9404,
            longitude: 108.4583,
            description: 'Homestay view thung lũng Đà Lạt, không khí trong lành, yên tĩnh.',
            amenities: ['Wifi', 'Lò sưởi', 'Hồ bơi', 'BBQ', 'Bãi đỗ xe'],
            checkInTime: '14:00',
            checkOutTime: '12:00',
            bufferHours: 2,
            isActive: true,
            isListedOnMarketplace: true,
        },
    });
    console.log(`   ✅ 2 chi nhánh\n`);

    // 7b. BRANCH IMAGES
    console.log('🖼️  Seeding branch images...');
    for (const [branchId, branchName] of [[branch1.id, 'HCM'], [branch2.id, 'DaLat']]) {
        const existing = await prisma.branchImage.findFirst({ where: { branchId } });
        if (!existing) {
            await prisma.branchImage.createMany({
                data: IMAGES.map((url, i) => ({
                    branchId,
                    cloudinaryPublicId: `placeholder_${branchName}_branch_${i + 1}`,
                    url,
                    altText: `Ảnh chi nhánh ${branchName} ${i + 1}`,
                    isCover: i === 0,
                    sortOrder: i + 1,
                })),
            });
        }
    }
    console.log(`   ✅ Ảnh branch\n`);

    // 8. ROOMS + ROOM RATES
    console.log('🛏️  Seeding rooms & rates...');

    const roomsData = [
        // Branch HCM
        {
            id: 'room-hcm-101',
            branchId: branch1.id,
            name: 'Phòng Standard 101',
            roomType: RoomType.STANDARD,
            capacity: 2,
            bedCount: 1,
            bedType: BedType.DOUBLE,
            floorNumber: 1,
            roomAmenities: ['TV', 'Điều hòa', 'Minibar', 'Wifi'],
        },
        {
            id: 'room-hcm-201',
            branchId: branch1.id,
            name: 'Phòng Deluxe 201',
            roomType: RoomType.DELUXE,
            capacity: 2,
            bedCount: 1,
            bedType: BedType.QUEEN,
            floorNumber: 2,
            roomAmenities: ['TV', 'Điều hòa', 'Minibar', 'Wifi', 'Ban công'],
        },
        {
            id: 'room-hcm-301',
            branchId: branch1.id,
            name: 'Suite 301',
            roomType: RoomType.SUITE,
            capacity: 4,
            bedCount: 2,
            bedType: BedType.KING,
            floorNumber: 3,
            roomAmenities: ['TV', 'Điều hòa', 'Minibar', 'Wifi', 'Ban công', 'Bồn tắm'],
        },
        // Branch Đà Lạt
        {
            id: 'room-dalat-101',
            branchId: branch2.id,
            name: 'Phòng View Thung Lũng',
            roomType: RoomType.DELUXE,
            capacity: 2,
            bedCount: 1,
            bedType: BedType.QUEEN,
            floorNumber: 1,
            roomAmenities: ['TV', 'Lò sưởi', 'Wifi', 'Ban công view thung lũng'],
        },
        {
            id: 'room-dalat-villa-01',
            branchId: branch2.id,
            name: 'Villa Vườn Thông',
            roomType: RoomType.VILLA,
            capacity: 6,
            bedCount: 3,
            bedType: BedType.KING,
            floorNumber: 1,
            roomAmenities: ['TV', 'Lò sưởi', 'Wifi', 'BBQ riêng', 'Sân vườn', 'Bếp đầy đủ'],
        },
    ];

    for (const roomData of roomsData) {
        const room = await prisma.room.upsert({
            where: { id: roomData.id },
            update: {},
            create: {
                ...roomData,
                status: RoomStatus.AVAILABLE,
            },
        });

        // Room Rates — mỗi phòng có 4 gói giá
        const basePrice = roomData.roomType === RoomType.VILLA ? 3000000
            : roomData.roomType === RoomType.SUITE ? 1500000
                : roomData.roomType === RoomType.DELUXE ? 800000
                    : 500000;

        const existingRates = await prisma.roomRate.findFirst({ where: { roomId: room.id } });
        if (!existingRates) {
            await prisma.roomRate.createMany({
                data: [
                    {
                        roomId: room.id,
                        label: '3 giờ',
                        durationHours: 3,
                        price: Math.round(basePrice * 0.3),
                        isActive: true,
                        sortOrder: 1,
                    },
                    {
                        roomId: room.id,
                        label: '8 giờ',
                        durationHours: 8,
                        price: Math.round(basePrice * 0.6),
                        isActive: true,
                        sortOrder: 2,
                    },
                    {
                        roomId: room.id,
                        label: 'Qua đêm',
                        durationHours: 14,
                        price: Math.round(basePrice * 0.8),
                        isActive: true,
                        sortOrder: 3,
                    },
                    {
                        roomId: room.id,
                        label: 'Cả ngày',
                        durationHours: 24,
                        price: basePrice,
                        isActive: true,
                        sortOrder: 4,
                    },
                ],
            });
        }

        // Room Images
        const existingRoomImg = await prisma.roomImage.findFirst({ where: { roomId: room.id } });
        if (!existingRoomImg) {
            await prisma.roomImage.createMany({
                data: IMAGES.map((url, i) => ({
                    roomId: room.id,
                    cloudinaryPublicId: `placeholder_room_${room.id}_${i + 1}`,
                    url,
                    altText: `${roomData.name} - ảnh ${i + 1}`,
                    isCover: i === 0,
                    sortOrder: i + 1,
                })),
            });
        }
    }
    console.log(`   ✅ ${roomsData.length} phòng, mỗi phòng 4 gói giá + 3 ảnh\n`);

    // 9. STAFF
    console.log('👥 Seeding staff...');

    const receptionistHash = await argon2.hash('Staff@123456');
    const housekeeperHash = await argon2.hash('Staff@123456');

    const receptionistUser = await prisma.user.upsert({
        where: { email: 'letan@vietstaydemo.vn' },
        update: {},
        create: {
            email: 'letan@vietstaydemo.vn',
            passwordHash: receptionistHash,
            phone: '0911111111',
            role: UserRole.RECEPTIONIST,
            isActive: true,
            isEmailVerified: true,
        },
    });

    const housekeeperUser = await prisma.user.upsert({
        where: { email: 'buongphong@vietstaydemo.vn' },
        update: {},
        create: {
            email: 'buongphong@vietstaydemo.vn',
            passwordHash: housekeeperHash,
            phone: '0922222222',
            role: UserRole.HOUSEKEEPER,
            isActive: true,
            isEmailVerified: true,
        },
    });

    const branchManagerUser = await prisma.user.upsert({
        where: { email: 'manager@vietstaydemo.vn' },
        update: {},
        create: {
            email: 'manager@vietstaydemo.vn',
            passwordHash: receptionistHash,
            phone: '0933333333',
            role: UserRole.BRANCH_MANAGER,
            isActive: true,
            isEmailVerified: true,
        },
    });

    // Staff records
    const today = new Date();

    const existingReceptionist = await prisma.staff.findFirst({ where: { userId: receptionistUser.id } });
    if (!existingReceptionist) {
        await prisma.staff.create({
            data: {
                userId: receptionistUser.id,
                organizationId: org.id,
                branchId: branch1.id,
                position: 'Lễ tân',
                staffRole: StaffRole.RECEPTIONIST,
                hireDate: today,
                isActive: true,
            },
        });
    }

    const existingHousekeeper = await prisma.staff.findFirst({ where: { userId: housekeeperUser.id } });
    if (!existingHousekeeper) {
        await prisma.staff.create({
            data: {
                userId: housekeeperUser.id,
                organizationId: org.id,
                branchId: branch1.id,
                position: 'Nhân viên buồng phòng',
                staffRole: StaffRole.HOUSEKEEPER,
                hireDate: today,
                isActive: true,
            },
        });
    }

    const existingManager = await prisma.staff.findFirst({ where: { userId: branchManagerUser.id } });
    if (!existingManager) {
        await prisma.staff.create({
            data: {
                userId: branchManagerUser.id,
                organizationId: org.id,
                branchId: branch1.id,
                position: 'Quản lý chi nhánh',
                staffRole: StaffRole.BRANCH_MANAGER,
                hireDate: today,
                isActive: true,
            },
        });
    }
    console.log(`   ✅ 3 nhân viên (manager, lễ tân, buồng phòng)\n`);

    // 10. GUEST PROFILES
    console.log('🙋 Seeding guest profiles...');
    const guests = [
        { fullName: 'Nguyễn Văn An', phone: '0901001001', email: 'an.nguyen@gmail.com', nationality: 'Việt Nam', tags: ['REGULAR'] },
        { fullName: 'Trần Thị Bình', phone: '0902002002', email: 'binh.tran@gmail.com', nationality: 'Việt Nam', tags: ['VIP'] },
        { fullName: 'Lê Minh Cường', phone: '0903003003', email: null, nationality: 'Việt Nam', tags: [] },
        { fullName: 'John Smith', phone: '0904004004', email: 'john.smith@email.com', nationality: 'Mỹ', tags: [] },
        { fullName: 'Yuki Tanaka', phone: '0905005005', email: 'yuki.tanaka@jp.com', nationality: 'Nhật Bản', tags: ['VIP'] },
    ];

    for (const guest of guests) {
        const existing = await prisma.guestProfile.findFirst({
            where: { phone: guest.phone, organizationId: org.id },
        });
        if (!existing) {
            await prisma.guestProfile.create({
                data: {
                    organizationId: org.id,
                    fullName: guest.fullName,
                    phone: guest.phone,
                    email: guest.email,
                    nationality: guest.nationality,
                    tags: guest.tags,
                },
            });
        }
    }
    console.log(`   ✅ ${guests.length} khách hàng mẫu\n`);

    // ─────────────────────────────────────────────
    // TỔNG KẾT
    // ─────────────────────────────────────────────
    console.log('━'.repeat(50));
    console.log('✅ Seed hoàn tất!\n');
    console.log('📋 Tài khoản test:');
    console.log('   Super Admin  : superadmin@system.local  / SuperAdmin@123');
    console.log('   Org Owner    : owner@vietstaydemo.vn    / OrgOwner@123');
    console.log('   Branch Mgr   : manager@vietstaydemo.vn  / Staff@123456');
    console.log('   Lễ tân       : letan@vietstaydemo.vn    / Staff@123456');
    console.log('   Buồng phòng  : buongphong@vietstaydemo.vn / Staff@123456');
    console.log('━'.repeat(50));
}

main()
    .catch((e) => {
        console.error('❌ Seed thất bại:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });